import { useCallback, useState, useEffect, useRef } from "react";
import { useToasts } from "react-toast-notifications";

import { useMapData } from "../contexts/MapDataContext";
import { useMapLoading } from "../contexts/MapLoadingContext";
import { useUserId } from "../contexts/UserIdContext";
import { useDatabase } from "../contexts/DatabaseContext";
import { useParty } from "../contexts/PartyContext";
import { useAssets } from "../contexts/AssetsContext";
import {
  PermissionStateUpdater,
  PermissionsProvider,
} from "../contexts/PermissionsContext";

import useDebounce from "../hooks/useDebounce";
import useNetworkedState from "../hooks/useNetworkedState";
import useMapActions from "../hooks/useMapActions";
import useTokenAttributesSync, {
  TokenAttributeUpdateInput,
} from "../hooks/useTokenAttributes";

import {
  canApplyPermissionDiff,
  normalizePermissionState,
  permissionStateKey,
} from "../helpers/permissions";

import { useTranslation } from "../i18n";

import Session, { PeerDataEvent, PeerDataProgressEvent } from "./Session";
import useAssetTransfer from "./useAssetTransfer";

import Action from "../actions/Action";

import Map from "../components/map/Map";
import TokenBar from "../components/token/TokenBar";

import GlobalImageDrop from "../components/image/GlobalImageDrop";

import { Map as MapType } from "../types/Map";
import { MapState } from "../types/MapState";
import { PermissionState } from "../types/Permission";
import {
  Asset,
  AssetManifest,
  AssetManifestAsset,
  AssetManifestAssets,
} from "../types/Asset";
import { TokenState } from "../types/TokenState";
import { DrawingState } from "../types/Drawing";
import { SpellTemplateState } from "../types/SpellTemplate";
import { Note } from "../types/Note";
import { TokenNote } from "../types/TokenNote";
import { WallState } from "../types/Wall";
import { MapStateSettingsChangeEventHandler } from "../types/Events";
import {
  AddStatesAction,
  EditStatesAction,
  RemoveStatesAction,
} from "../actions";

/**
 * 素材发布结果：
 * - `url`   ：素材已经在服务器上，转发 URL 让对端用 HTTP 拉取
 * - `asset` ：服务器没有可用的资源服务或上传失败，只能中继原始字节
 * - `fail`  ：确认无素材可发
 */
type PublishedAsset =
  | { type: "url"; url: string; size?: number; originalName?: string }
  | { type: "asset"; asset: Asset }
  | { type: "fail" };

/** 服务器/素材所有者长时间没有响应时的重试间隔与最大次数 */
const ASSET_REQUEST_TIMEOUT_MS = 8000;
const ASSET_REQUEST_MAX_ATTEMPTS = 3;

function normalizeMapState(state: MapState | null): MapState | null {
  if (!state) {
    return state;
  }
  if (!state.walls) {
    state.walls = {};
  }
  if (Array.isArray(state.explored)) {
    return state;
  }
  return { ...state, explored: [] };
}

/**
 * @typedef {object} NetworkedMapProps
 * @property {Session} session
 */

/**
 * @param {NetworkedMapProps} props
 */
function NetworkedMapAndTokens({
  session,
  gameId,
}: {
  session: Session;
  gameId: string;
}) {
  const { addToast } = useToasts();
  const t = useTranslation();
  const userId = useUserId();
  const partyState = useParty();
  const { assetLoadStart, assetProgressUpdate, isLoading } = useMapLoading();

  const { updateMapState } = useMapData();
  const { getAsset, putAsset } = useAssets();

  const [currentMap, setCurrentMap] = useState<MapType | null>(null);
  const [currentMapState, setCurrentMapState] =
    useNetworkedState<MapState | null>(
      null,
      session,
      "map_state",
      500,
      true,
      "mapId",
      normalizeMapState
    );
  const [assetManifest, setAssetManifest] =
    useNetworkedState<AssetManifest | null>(
      null,
      session,
      "manifest",
      500,
      true,
      "mapId"
    );

  async function loadAssetManifestFromMap(map: MapType, mapState: MapState) {
    const assets: AssetManifestAssets = {};
    const { owner } = map;
    let processedTokens = new Set();
    for (let tokenState of Object.values(mapState.tokens)) {
      if (tokenState.type === "file" && !processedTokens.has(tokenState.file)) {
        processedTokens.add(tokenState.file);
        assets[tokenState.file] = {
          id: tokenState.file,
          owner: tokenState.owner,
        };
      }
    }
    if (map.type === "file") {
      assets[map.thumbnail] = { id: map.thumbnail, owner };
      if (map.quality !== "original") {
        const qualityId = map.resolutions[map.quality];
        if (qualityId) {
          assets[qualityId] = { id: qualityId, owner };
        }
      } else {
        assets[map.file] = { id: map.file, owner };
      }
    }
    setAssetManifest({ mapId: map.id, assets }, true, true);
  }

  function addAssetsIfNeeded(assets: AssetManifestAsset[]) {
    setAssetManifest((prevManifest) => {
      if (prevManifest?.assets) {
        let newAssets = { ...prevManifest.assets };
        for (let asset of assets) {
          const id = asset.id;
          const exists = id in newAssets;
          if (!exists) {
            newAssets[id] = asset;
          }
        }
        return { ...prevManifest, assets: newAssets };
      }
      return prevManifest;
    });
  }

  const { assetApiBase, uploadAsset, downloadAsset } = useAssetTransfer(gameId);

  // Keep track of assets we are already requesting to prevent from loading them multiple times
  const requestingAssetsRef = useRef(new Set());
  const pendingAssetTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const assetDownloadFailuresRef = useRef<Record<string, number>>({});
  const assetRequestAttemptsRef = useRef<Record<string, number>>({});
  // 注意：本文件里 `Map` 是地图组件，所以要显式用 `globalThis.Map`
  const publishAssetPromisesRef = useRef(
    new globalThis.Map<string, Promise<PublishedAsset>>()
  );

  /** 解除请求锁与计时器（不改变进度条） */
  function releaseAssetRequest(assetId: string) {
    requestingAssetsRef.current.delete(assetId);
    delete assetRequestAttemptsRef.current[assetId];
    const pendingTimeout = pendingAssetTimeoutsRef.current[assetId];
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      delete pendingAssetTimeoutsRef.current[assetId];
    }
  }

  /** 一次素材请求彻底结束：解锁并把进度条推到 100% */
  function finishAssetRequest(assetId: string) {
    releaseAssetRequest(assetId);
    assetProgressUpdate({ id: assetId, total: 1, count: 1 });
  }

  /** 等待对端响应期间的兜底：超时仍无结果就放弃本次请求 */
  function armAssetResponseTimeout(assetId: string) {
    const existingTimeout = pendingAssetTimeoutsRef.current[assetId];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    pendingAssetTimeoutsRef.current[assetId] = setTimeout(() => {
      if (!requestingAssetsRef.current.has(assetId)) {
        return;
      }
      finishAssetRequest(assetId);
      addToast(t("misc.assetTransfer.transferFailed"));
    }, ASSET_REQUEST_TIMEOUT_MS);
  }

  /**
   * 把素材发布到服务器（HTTP 资源接口）。
   *
   * 同一素材的并发发布会共享同一个 Promise，避免多个请求者触发重复上传；
   * 没有配置资源服务或上传失败时返回 `{ type: "asset" }`，由服务器中继原始字节兜底。
   */
  async function publishAsset(
    asset: Asset,
    options?: { force?: boolean }
  ): Promise<PublishedAsset> {
    if (!assetApiBase) {
      return { type: "asset", asset };
    }
    if (!options?.force && asset.remoteUrl) {
      return {
        type: "url",
        url: asset.remoteUrl,
        size: asset.size,
        originalName: asset.originalName,
      };
    }

    const inFlight = publishAssetPromisesRef.current.get(asset.id);
    if (inFlight) {
      return inFlight;
    }

    const promise = (async (): Promise<PublishedAsset> => {
      try {
        const response = await uploadAsset(asset);
        const url = response.url;
        if (!url) {
          return { type: "asset", asset };
        }
        await putAsset({
          ...asset,
          remoteUrl: url,
          size: response.size ?? asset.size,
          originalName: response.originalName ?? asset.originalName,
          source: asset.source ?? "uploaded",
        });
        return {
          type: "url",
          url,
          size: response.size ?? asset.size,
          originalName: response.originalName ?? asset.originalName,
        };
      } catch (error) {
        console.error("ASSET_UPLOAD_TO_SERVER_FAILED", error);
        return { type: "asset", asset };
      }
    })();

    publishAssetPromisesRef.current.set(asset.id, promise);
    try {
      return await promise;
    } finally {
      publishAssetPromisesRef.current.delete(asset.id);
    }
  }

  /**
   * 通过服务器向素材所有者请求素材。
   *
   * 所有消息都经服务器（socket.io relay_chunk）转发，不做 WebRTC 打洞；
   * 大文件由所有者上传到服务器的 `/assets` 接口，再把 URL 转回来。
   * 长时间没有响应按 `ASSET_REQUEST_MAX_ATTEMPTS` 重试，超限后放弃并提示。
   */
  async function requestAssetFromServer(
    targetSessionId: string,
    assetId: string
  ) {
    const queued = await session.sendAssetTo(targetSessionId, "assetRequest", {
      id: assetId,
      gameId,
    });
    if (!queued) {
      // 服务器还没连上，先解锁，等下一次 party_state 广播后重试
      releaseAssetRequest(assetId);
      return;
    }

    const scheduleRetry = () => {
      const existingTimeout = pendingAssetTimeoutsRef.current[assetId];
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      pendingAssetTimeoutsRef.current[assetId] = setTimeout(() => {
        if (!requestingAssetsRef.current.has(assetId)) {
          return;
        }
        const attempts = (assetRequestAttemptsRef.current[assetId] ?? 0) + 1;
        assetRequestAttemptsRef.current[assetId] = attempts;
        if (attempts >= ASSET_REQUEST_MAX_ATTEMPTS) {
          finishAssetRequest(assetId);
          addToast(t("misc.assetTransfer.transferFailed"));
          return;
        }
        void session.sendAssetTo(targetSessionId, "assetRequest", {
          id: assetId,
          gameId,
        });
        scheduleRetry();
      }, ASSET_REQUEST_TIMEOUT_MS);
    };

    scheduleRetry();
  }

  useEffect(() => {
    if (!assetManifest || !userId) {
      return;
    }

    async function requestAssetsIfNeeded() {
      if (!assetManifest) {
        return;
      }
      for (let asset of Object.values(assetManifest.assets)) {
        if (
          asset.owner === userId ||
          requestingAssetsRef.current.has(asset.id)
        ) {
          continue;
        }

        const ownerEntry = Object.entries(partyState).find(([, player]) => {
          return player.userId === asset.owner;
        });

        const ownerSessionId = ownerEntry?.[0];
        const ownerState = ownerEntry?.[1];

        // Ensure requests are added before any async operation to prevent duplicate sends
        requestingAssetsRef.current.add(asset.id);

        const cachedAsset = await getAsset(asset.id);
        if (!ownerState || !ownerSessionId) {
          // Add no owner toast if we don't have asset in our cache
          if (!cachedAsset) {
            // TODO: Stop toast from appearing multiple times
            addToast(t("misc.assetTransfer.ownerNotFound"));
          }
          requestingAssetsRef.current.delete(asset.id);
          continue;
        }

        const targetSessionId = ownerState.sessionId || ownerSessionId;

        if (cachedAsset) {
          requestingAssetsRef.current.delete(asset.id);
        } else if (targetSessionId) {
          assetLoadStart(asset.id);
          await requestAssetFromServer(targetSessionId, asset.id);
        } else {
          // 无法立即请求，解除锁定以便后续重试
          requestingAssetsRef.current.delete(asset.id);
        }
      }
    }

    requestAssetsIfNeeded();
  }, [
    assetManifest,
    partyState,
    session,
    userId,
    addToast,
    t,
    getAsset,
    assetLoadStart,
    assetProgressUpdate,
    gameId,
  ]);

  /**
   * Map state
   */

  const { database } = useDatabase();
  // Sync the map state to the database after 500ms of inactivity
  const debouncedMapState = useDebounce(currentMapState, 500);
  useEffect(() => {
    if (
      debouncedMapState &&
      debouncedMapState.mapId &&
      currentMap &&
      currentMap?.owner === userId &&
      database
    ) {
      updateMapState(debouncedMapState.mapId, debouncedMapState);
    }
  }, [currentMap, debouncedMapState, userId, database, updateMapState]);

  async function handleMapChange(
    newMap: MapType | null,
    newMapState: MapState | null
  ) {
    // Clear map before sending new one
    setCurrentMap(null);
    session.socket?.emit("map", null);

    setCurrentMapState(newMapState, true, true);
    setCurrentMap(newMap);

    session.socket?.emit("map", newMap);

    if (!newMap || !newMapState) {
      setAssetManifest(null, true, true);
      return;
    }

    await loadAssetManifestFromMap(newMap, newMapState);
  }

  const [mapActions, addActions, updateActionIndex, resetActions] =
    useMapActions(setCurrentMapState);

  const { sendTokenAttributesUpdate, sendTokenAttributesBulk } =
    useTokenAttributesSync(session, currentMapState, setCurrentMapState);

  function handleMapReset(newMapState: MapState) {
    setCurrentMapState(newMapState, true, true);
    resetActions();
  }

  function handleMapDraw(action: Action<DrawingState>) {
    addActions([{ type: "drawings", action }]);
  }

  function handleWallDraw(action: Action<WallState>) {
    addActions([{ type: "walls", action }]);
  }

  function handleTemplateDraw(action: Action<SpellTemplateState>) {
    addActions([{ type: "templates", action }]);
  }

  const handleMapStateChange: MapStateSettingsChangeEventHandler = (change) => {
    if (
      currentMapState &&
      Array.isArray(change.explored) &&
      change.explored.length === 0
    ) {
      setCurrentMapState(
        (prevState) => {
          if (!prevState) {
            return prevState;
          }
          return { ...prevState, ...change };
        },
        false,
        false,
        true
      );
      session.socket?.emit("explored_reset", { mapId: currentMapState.mapId });
      return;
    }
    setCurrentMapState((prevState) => {
      if (!prevState) {
        return prevState;
      }
      return { ...prevState, ...change };
    });
  };

  function handleUndo() {
    updateActionIndex(-1);
  }

  function handleRedo() {
    updateActionIndex(1);
  }

  // If map changes clear map actions
  const previousMapIdRef = useRef<string>();
  useEffect(() => {
    if (currentMap && currentMap?.id !== previousMapIdRef.current) {
      resetActions();
      previousMapIdRef.current = currentMap?.id;
    }
  }, [currentMap, resetActions]);

  function handleNoteCreate(notes: Note[]) {
    const action = new AddStatesAction(notes);
    addActions([{ type: "notes", action }]);
  }

  function handleNoteChange(changes: Record<string, Partial<Note>>) {
    let edits: Partial<Note>[] = [];
    for (let id in changes) {
      edits.push({ ...changes[id], id });
    }
    const action = new EditStatesAction(edits);
    addActions([{ type: "notes", action }]);
  }

  function handleNoteRemove(noteIds: string[]) {
    const action = new RemoveStatesAction<Note>(noteIds);
    addActions([{ type: "notes", action }]);
  }

  function handleTokenNoteCreate(notes: TokenNote[]) {
    setCurrentMapState((prevState) => {
      if (!prevState) {
        return prevState;
      }
      const nextTokenNotes = { ...(prevState.tokenNotes || {}) };
      for (const note of notes) {
        nextTokenNotes[note.id] = note;
      }
      return { ...prevState, tokenNotes: nextTokenNotes };
    }, true);
  }

  function handleTokenNoteChange(changes: Record<string, Partial<TokenNote>>) {
    setCurrentMapState((prevState) => {
      if (!prevState) {
        return prevState;
      }
      const nextTokenNotes = { ...(prevState.tokenNotes || {}) };
      for (const id of Object.keys(changes)) {
        const existing = nextTokenNotes[id];
        if (existing) {
          nextTokenNotes[id] = { ...existing, ...changes[id], id };
        }
      }
      return { ...prevState, tokenNotes: nextTokenNotes };
    }, true);
  }

  function handleTokenNoteRemove(noteIds: string[]) {
    setCurrentMapState((prevState) => {
      if (!prevState) {
        return prevState;
      }
      const nextTokenNotes = { ...(prevState.tokenNotes || {}) };
      for (const id of noteIds) {
        delete nextTokenNotes[id];
      }
      return { ...prevState, tokenNotes: nextTokenNotes };
    }, true);
  }

  /**
   * Token state
   */

  async function handleMapTokensStateCreate(tokenStates: TokenState[]) {
    if (!currentMap || !currentMapState) {
      return;
    }

    let assets: AssetManifestAsset[] = [];
    for (let tokenState of tokenStates) {
      if (tokenState.type === "file") {
        assets.push({ id: tokenState.file, owner: tokenState.owner });
      }
    }
    if (assets.length > 0) {
      addAssetsIfNeeded(assets);
    }

    const action = new AddStatesAction(tokenStates);
    addActions([{ type: "tokens", action }]);
  }

  function isTokenPositionOnly(
    changes: Record<string, Partial<TokenState>>
  ): boolean {
    const allowedKeys = new Set(["x", "y", "lastModified", "lastModifiedBy"]);
    return Object.values(changes).every((change) =>
      Object.keys(change).every((key) => allowedKeys.has(key))
    );
  }

  function buildAttributeUpdate(
    tokenStateId: string,
    nextAttributes: TokenState["attributes"],
    now: number
  ) {
    if (!currentMapState || !nextAttributes) {
      return null;
    }
    const currentAttributes =
      currentMapState.tokens[tokenStateId]?.attributes ?? null;
    const baseBars = Array.isArray(nextAttributes.bars)
      ? nextAttributes.bars
      : currentAttributes?.bars ?? [];
    const baseValues = Array.isArray(nextAttributes.values)
      ? nextAttributes.values
      : currentAttributes?.values ?? [];
    const currentVersion = currentAttributes?.version ?? 0;
    const requestedVersion =
      typeof nextAttributes.version === "number"
        ? nextAttributes.version
        : currentVersion + 1;
    const nextVersion =
      requestedVersion <= currentVersion ? currentVersion + 1 : requestedVersion;
    const nextUpdatedBy =
      userId || nextAttributes.updatedBy || currentAttributes?.updatedBy || "unknown";
    const normalizedAttributes = {
      ...nextAttributes,
      bars: baseBars,
      values: baseValues,
      version: nextVersion,
      updatedAt: now,
      updatedBy: nextUpdatedBy,
    };
    const updateInput: TokenAttributeUpdateInput = {
      tokenStateId,
      version: normalizedAttributes.version,
      updatedAt: normalizedAttributes.updatedAt,
      updatedBy: normalizedAttributes.updatedBy,
      patch: { attributes: normalizedAttributes },
    };
    return { normalizedAttributes, updateInput };
  }

  function handleMapTokenStateChange(
    changes: Record<string, Partial<TokenState>>
  ) {
    const now = Date.now();
    const normalizedChanges: Record<string, Partial<TokenState>> = {};
    const attributeUpdates: TokenAttributeUpdateInput[] = [];
    for (let id in changes) {
      const change = changes[id];
      let nextChange = { ...change };
      if (change.attributes) {
        const result = buildAttributeUpdate(id, change.attributes, now);
        if (result) {
          nextChange = {
            ...nextChange,
            attributes: result.normalizedAttributes,
          };
          attributeUpdates.push(result.updateInput);
        }
      }
      normalizedChanges[id] = nextChange;
    }

    let edits: Partial<TokenState>[] = [];
    for (let id in normalizedChanges) {
      edits.push({ ...normalizedChanges[id], id });
    }
    const action = new EditStatesAction(edits);
    if (currentMapState && isTokenPositionOnly(normalizedChanges)) {
      addActions([{ type: "tokens", action }], false, true);
      session.socket?.emit("token_positions", {
        mapId: currentMapState.mapId,
        changes: normalizedChanges,
      });
      return;
    }
    addActions([{ type: "tokens", action }]);

    if (attributeUpdates.length === 1) {
      sendTokenAttributesUpdate(attributeUpdates[0]);
    } else if (attributeUpdates.length > 1) {
      sendTokenAttributesBulk({ updates: attributeUpdates });
    }
  }

  function handleMapTokenStateRemove(tokenStateIds: string[]) {
    const action = new RemoveStatesAction<TokenState>(tokenStateIds);
    addActions([{ type: "tokens", action }]);
  }

  function handleSelectionItemsChange(
    tokenChanges: Record<string, Partial<TokenState>>,
    noteChanges: Record<string, Partial<Note>>
  ) {
    const now = Date.now();
    const normalizedTokenChanges: Record<string, Partial<TokenState>> = {};
    const attributeUpdates: TokenAttributeUpdateInput[] = [];
    for (let id in tokenChanges) {
      const change = tokenChanges[id];
      let nextChange = { ...change };
      if (change.attributes) {
        const result = buildAttributeUpdate(id, change.attributes, now);
        if (result) {
          nextChange = {
            ...nextChange,
            attributes: result.normalizedAttributes,
          };
          attributeUpdates.push(result.updateInput);
        }
      }
      normalizedTokenChanges[id] = nextChange;
    }

    let tokenEdits: Partial<TokenState>[] = [];
    for (let id in normalizedTokenChanges) {
      tokenEdits.push({ ...normalizedTokenChanges[id], id });
    }
    const tokenAction = new EditStatesAction(tokenEdits);

    let noteEdits: Partial<Note>[] = [];
    for (let id in noteChanges) {
      noteEdits.push({ ...noteChanges[id], id });
    }
    const noteAction = new EditStatesAction(noteEdits);

    addActions([
      { type: "tokens", action: tokenAction },
      { type: "notes", action: noteAction },
    ]);

    if (attributeUpdates.length === 1) {
      sendTokenAttributesUpdate(attributeUpdates[0]);
    } else if (attributeUpdates.length > 1) {
      sendTokenAttributesBulk({ updates: attributeUpdates });
    }
  }

  function handleSelectionItemsRemove(
    tokenStateIds: string[],
    noteIds: string[]
  ) {
    const tokenAction = new RemoveStatesAction<TokenState>(tokenStateIds);
    const noteAction = new RemoveStatesAction<Note>(noteIds);
    addActions([
      { type: "tokens", action: tokenAction },
      { type: "notes", action: noteAction },
    ]);
  }

  function handleSelectionItemsCreate(
    tokenStates: TokenState[],
    notes: Note[]
  ) {
    const tokenAction = new AddStatesAction(tokenStates);
    const noteAction = new AddStatesAction(notes);
    addActions([
      { type: "tokens", action: tokenAction },
      { type: "notes", action: noteAction },
    ]);
  }

  useEffect(() => {
    /** 把素材以「URL」或「原始字节」的形式经服务器发给请求方 */
    async function sendAssetToPeer(
      targetSessionId: string,
      asset: Asset,
      published: PublishedAsset
    ) {
      if (published.type === "fail") {
        await session.sendAssetTo(
          targetSessionId,
          "assetResponseFail",
          asset.id,
          asset.id
        );
        return;
      }
      if (published.type === "url") {
        await session.sendAssetTo(
          targetSessionId,
          "assetResponseUrl",
          {
            id: asset.id,
            url: published.url,
            mime: asset.mime,
            width: asset.width,
            height: asset.height,
            owner: asset.owner,
            size: published.size ?? asset.size,
            originalName: published.originalName ?? asset.originalName,
          },
          asset.id
        );
        return;
      }
      await session.sendAssetTo(
        targetSessionId,
        "assetResponseSuccess",
        published.asset,
        asset.id
      );
    }

    async function handlePeerData({ peer, id, data }: PeerDataEvent) {
      const peerId = peer?.id;
      const assetId =
        typeof data === "string"
          ? data
          : typeof data?.id === "string"
          ? data.id
          : undefined;
      const requestedGameId =
        typeof data?.gameId === "string" ? data.gameId : gameId;

      // 请求方 -> 所有者：请把这个素材发布到服务器
      if (id === "assetRequest") {
        if (!peerId || !assetId) {
          return;
        }
        if (requestedGameId !== gameId) {
          await session.sendAssetTo(
            peerId,
            "assetResponseFail",
            assetId,
            assetId
          );
          return;
        }

        const asset = await getAsset(assetId);
        if (!asset) {
          await session.sendAssetTo(
            peerId,
            "assetResponseFail",
            assetId,
            assetId
          );
          return;
        }

        const published = await publishAsset(asset);
        await sendAssetToPeer(peerId, asset, published);
        return;
      }

      // 请求方 -> 所有者：服务器上的 URL 拉取失败
      if (id === "assetUrlFailed") {
        if (!peerId || !assetId || requestedGameId !== gameId) {
          return;
        }

        const asset = await getAsset(assetId);
        if (!asset) {
          await session.sendAssetTo(
            peerId,
            "assetResponseFail",
            assetId,
            assetId
          );
          return;
        }

        if (data?.reason === "download_failed" || !assetApiBase) {
          // 对端完全拉不到资源服务：直接中继原始字节
          await session.sendAssetTo(
            peerId,
            "assetResponseSuccess",
            asset,
            asset.id
          );
          return;
        }

        // URL 失效（例如服务端缓存已过期）：强制重新上传一次
        const published = await publishAsset(asset, { force: true });
        await sendAssetToPeer(peerId, asset, published);
        return;
      }

      if (id === "assetResponseUrl") {
        const url = data?.url;
        if (!assetId || typeof url !== "string") {
          return;
        }

        try {
          const buffer = await downloadAsset(url);
          const assetFromServer: Asset = {
            id: assetId,
            owner: data?.owner ?? "unknown",
            mime: data?.mime ?? "application/octet-stream",
            width: data?.width ?? 0,
            height: data?.height ?? 0,
            file: buffer,
            remoteUrl: url,
            size: data?.size,
            originalName: data?.originalName,
            source: "uploaded",
          };
          await putAsset(assetFromServer);
          delete assetDownloadFailuresRef.current[assetId];
          finishAssetRequest(assetId);
        } catch (error) {
          const status = (error as Error & { status?: number })?.status;
          const isNetworkError =
            status === undefined &&
            error instanceof Error &&
            error.message === "Failed to fetch";
          const isMissing =
            status === 404 ||
            (error instanceof Error &&
              error.message === "asset_download_failed_404");
          if ((isMissing || isNetworkError) && peerId) {
            // 保持请求锁，等所有者重新上传或改用服务器中继原始字节
            const previousFailures = assetDownloadFailuresRef.current[assetId] ?? 0;
            const failureCount = previousFailures + 1;
            assetDownloadFailuresRef.current[assetId] = failureCount;
            const forceRelay = failureCount >= 2 || isNetworkError;
            armAssetResponseTimeout(assetId);
            await session.sendAssetTo(
              peerId,
              "assetUrlFailed",
              {
                id: assetId,
                gameId,
                reason: forceRelay ? "download_failed" : "not_found",
              },
              assetId
            );
          } else {
            console.error("ASSET_DOWNLOAD_FAILED", error);
            addToast(t("misc.assetTransfer.downloadFailed"));
            finishAssetRequest(assetId);
          }
        }
        return;
      }

      if (id === "assetResponseSuccess") {
        const asset = data;
        if (asset?.id) {
          await putAsset(asset);
          delete assetDownloadFailuresRef.current[asset.id];
          finishAssetRequest(asset.id);
        }
        return;
      }

      if (id === "assetResponseFail") {
        if (!assetId) {
          return;
        }
        delete assetDownloadFailuresRef.current[assetId];
        finishAssetRequest(assetId);
        addToast(t("misc.assetTransfer.transferFailed"));
      }
    }

    function handlePeerDataProgress({
      id,
      total,
      count,
    }: PeerDataProgressEvent) {
      assetProgressUpdate({ id, total, count });
    }

    async function handleSocketMap(map?: MapType) {
      if (map) {
        setCurrentMap(map);
      } else {
        setCurrentMap(null);
      }
    }

    function handleTokenPositions(update: {
      mapId?: string;
      changes?: Record<string, Partial<TokenState>>;
    }) {
      if (!update || !update.changes) {
        return;
      }
      setCurrentMapState(
        (prevState) => {
          if (!prevState || !update.mapId || prevState.mapId !== update.mapId) {
            return prevState;
          }
          const nextTokens = { ...prevState.tokens };
          const changes = update.changes ?? {};
          for (const [id, change] of Object.entries(changes)) {
            const existing = nextTokens[id];
            if (!existing) {
              continue;
            }
            if (existing.type === "file") {
              nextTokens[id] = {
                ...existing,
                ...change,
                type: "file",
              };
            } else {
              nextTokens[id] = {
                ...existing,
                ...change,
                type: "default",
              };
            }
          }
          return { ...prevState, tokens: nextTokens };
        },
        false,
        false,
        true
      );
    }

    function handleExploredReset(update: { mapId?: string }) {
      if (!update?.mapId) {
        return;
      }
      setCurrentMapState(
        (prevState) => {
          if (!prevState || prevState.mapId !== update.mapId) {
            return prevState;
          }
          return { ...prevState, explored: [] };
        },
        false,
        false,
        true
      );
    }

    session.on("peerData", handlePeerData);
    session.on("peerDataProgress", handlePeerDataProgress);
    session.socket?.on("map", handleSocketMap);
    session.socket?.on("token_positions", handleTokenPositions);
    session.socket?.on("explored_reset", handleExploredReset);

    return () => {
      session.off("peerData", handlePeerData);
      session.off("peerDataProgress", handlePeerDataProgress);
      session.socket?.off("map", handleSocketMap);
      session.socket?.off("token_positions", handleTokenPositions);
      session.socket?.off("explored_reset", handleExploredReset);
    };
  });

  const canChangeMap = !isLoading;

  /**
   * 权限规则和其它 mapState 字段一样走同一条同步通道：
   * 房主改动后会通过 `map_state_update` 增量广播给所有人。
   *
   * 唯一的例外是「这张地图第一次设置权限」：此时 `permissions` 在服务端和
   * 其它客户端都还不存在，而增量同步会跳过路径不存在的编辑变更
   * （见 `canApplyPermissionDiff`），改动会被静默丢掉。
   * 所以第一次必须走整份 `map_state` 全量同步，把字段先在所有端建起来。
   */
  const canApplyPermissionDiffNow =
    currentMapState !== null &&
    canApplyPermissionDiff(currentMapState?.permissions);

  const handlePermissionChange: PermissionStateUpdater = useCallback(
    (mutate) => {
      const needsFullSync = !canApplyPermissionDiffNow;
      setCurrentMapState(
        (prevState) => {
          if (!prevState) {
            return prevState;
          }
          const current: PermissionState = normalizePermissionState(
            prevState.permissions,
            prevState.editFlags ?? []
          );
          const nextPermissions = mutate(current);
          if (
            prevState.permissions &&
            permissionStateKey(prevState.permissions) ===
              permissionStateKey(nextPermissions)
          ) {
            // 没有实际变化就不要触发同步
            return prevState;
          }
          return { ...prevState, permissions: nextPermissions };
        },
        true,
        needsFullSync
      );
    },
    [canApplyPermissionDiffNow, setCurrentMapState]
  );

  return (
    <GlobalImageDrop
      onMapChange={handleMapChange}
      onMapTokensStateCreate={handleMapTokensStateCreate}
    >
      <PermissionsProvider
        map={currentMap}
        mapState={currentMapState}
        onPermissionChange={handlePermissionChange}
      >
        <Map
          map={currentMap}
          mapState={currentMapState}
          mapActions={mapActions}
          onMapTokenStateChange={handleMapTokenStateChange}
          onMapTokenStateRemove={handleMapTokenStateRemove}
          onMapTokensStateCreate={handleMapTokensStateCreate}
          onSelectionItemsChange={handleSelectionItemsChange}
          onSelectionItemsRemove={handleSelectionItemsRemove}
          onSelectionItemsCreate={handleSelectionItemsCreate}
          onMapChange={handleMapChange}
          onMapReset={handleMapReset}
          onMapStateChange={handleMapStateChange}
          onMapDraw={handleMapDraw}
          onWallDraw={handleWallDraw}
          onMapTemplateDraw={handleTemplateDraw}
          onMapNoteCreate={handleNoteCreate}
          onMapNoteChange={handleNoteChange}
          onMapNoteRemove={handleNoteRemove}
          onMapTokenNoteCreate={handleTokenNoteCreate}
          onMapTokenNoteChange={handleTokenNoteChange}
          onMapTokenNoteRemove={handleTokenNoteRemove}
          allowMapChange={canChangeMap}
          session={session}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
        <TokenBar onMapTokensStateCreate={handleMapTokensStateCreate} />
      </PermissionsProvider>
    </GlobalImageDrop>
  );
}

export default NetworkedMapAndTokens;
