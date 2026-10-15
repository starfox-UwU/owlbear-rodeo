import React, { createContext, useCallback, useContext, useMemo } from "react";

import { useParty } from "./PartyContext";
import { usePlayerState } from "./PlayerContext";
import { useUserId } from "./UserIdContext";

import {
  PermissionRulePatch,
  clearPermissionRulesForItems,
  createDefaultPermissionState,
  hasItemPermissionRule,
  normalizePermissionState,
  permissionAllows,
  permissionStateKey,
  resolvePermissionLevel,
  resolvePermissionRule,
  setPermissionRule,
  setPermissionRuleForItems,
} from "../helpers/permissions";

import type { Map } from "../types/Map";
import { MapState } from "../types/MapState";
import {
  PermissionLevel,
  PermissionRule,
  PermissionState,
  PermissionTarget,
} from "../types/Permission";

/** 可以被单独授权的玩家 */
export type PermissionPlayer = {
  userId: string;
  nickname: string;
  /** 是否是当前客户端的使用者 */
  isSelf: boolean;
};

export type PermissionsContextValue = {
  /** 当前客户端是不是房主（地图所有者）。房主永远拥有全部权限 */
  isGM: boolean;
  userId?: string;
  /** 整理过的权限状态，永远可以直接使用 */
  state: PermissionState;
  /** 可选为授权对象的玩家（不含房主自己） */
  players: PermissionPlayer[];

  /** 求某个玩家对某个物件的最终等级 */
  levelFor(
    target: PermissionTarget,
    itemId?: string,
    itemOwnerId?: string
  ): PermissionLevel;
  canView(
    target: PermissionTarget,
    itemId?: string,
    itemOwnerId?: string
  ): boolean;
  canMove(
    target: PermissionTarget,
    itemId?: string,
    itemOwnerId?: string
  ): boolean;
  canEdit(
    target: PermissionTarget,
    itemId?: string,
    itemOwnerId?: string
  ): boolean;

  /** 某个物件自己设置的规则（不含继承来的），没设置时为 undefined */
  itemRule(itemId: string): PermissionRule | undefined;
  /** 某个类别当前生效的默认规则 */
  defaultRule(target: PermissionTarget): PermissionRule;
  /** 某个物件是否被单独设置过 */
  hasItemRule(itemId: string): boolean;

  /** 写入规则；`itemId` 为 `null` 表示写类别默认。仅房主生效 */
  setRule(
    target: PermissionTarget,
    itemId: string | null,
    patch: PermissionRulePatch
  ): void;
  /** 一次性把同一条规则写到多个物件上 */
  setRules(
    target: PermissionTarget,
    itemIds: readonly string[],
    patch: PermissionRulePatch
  ): void;
  /** 清除这些物件的单独设置，让它们回到类别默认 */
  clearRules(itemIds: readonly string[]): void;
};

const noop = () => {};

const defaultContextValue: PermissionsContextValue = {
  isGM: false,
  userId: undefined,
  state: createDefaultPermissionState([]),
  players: [],
  levelFor: (target, itemId, itemOwnerId) =>
    resolvePermissionLevel(defaultContextValue.state, target, itemId, {
      itemOwnerId,
    }),
  canView: () => true,
  canMove: () => false,
  canEdit: () => false,
  itemRule: () => undefined,
  defaultRule: (target) =>
    defaultContextValue.state.defaults[target] ?? { everyone: "view" },
  hasItemRule: () => false,
  setRule: noop,
  setRules: noop,
  clearRules: noop,
};

const PermissionsContext =
  createContext<PermissionsContextValue>(defaultContextValue);

export type PermissionStateUpdater = (
  mutate: (state: PermissionState) => PermissionState
) => void;

type PermissionsProviderProps = {
  map: Map | null;
  mapState: MapState | null;
  /** 把新的权限状态写回 mapState（由 NetworkedMapAndTokens 提供） */
  onPermissionChange: PermissionStateUpdater;
  children: React.ReactNode;
};

export function PermissionsProvider({
  map,
  mapState,
  onPermissionChange,
  children,
}: PermissionsProviderProps) {
  const userId = useUserId();
  const partyState = useParty();
  const playerState = usePlayerState();

  const isGM = !!map && !!userId && map.owner === userId;
  const editFlags = mapState?.editFlags;
  const editFlagsKey = (editFlags ?? []).join("|");

  /**
   * ⚠️ 依赖里用的是**内容指纹**而不是 `mapState.permissions` 的引用。
   *
   * 收到 `map_state_update` 时是「浅拷贝 mapState + 就地改嵌套对象」，
   * `permissions` 的引用常常没变。如果按引用记忆，玩家端会一直沿用旧的
   * 权限结论，表现为「房主改了权限，另一边必须刷新才生效」。
   */
  const permissionsKey = permissionStateKey(mapState?.permissions);

  const state = useMemo(
    () =>
      normalizePermissionState(mapState?.permissions, editFlags ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissionsKey, editFlagsKey]
  );

  /**
   * 可选为授权对象的玩家。
   * 用 `userId` 而不是 session id，这样换设备 / 重连后规则依然有效。
   */
  const players = useMemo(() => {
    const byUserId = new Map<string, PermissionPlayer>();
    const owner = map?.owner;

    if (userId && !isGM) {
      byUserId.set(userId, {
        userId,
        nickname: playerState?.nickname || "",
        isSelf: true,
      });
    }

    for (const member of Object.values(partyState ?? {})) {
      const memberUserId = member?.userId;
      if (!memberUserId || memberUserId === owner) {
        continue;
      }
      const existing = byUserId.get(memberUserId);
      if (existing) {
        if (!existing.nickname && member.nickname) {
          existing.nickname = member.nickname;
        }
        continue;
      }
      byUserId.set(memberUserId, {
        userId: memberUserId,
        nickname: member.nickname || "",
        isSelf: memberUserId === userId,
      });
    }

    return [...byUserId.values()].sort((a, b) =>
      a.nickname.localeCompare(b.nickname)
    );
  }, [partyState, userId, isGM, map?.owner, playerState?.nickname]);

  const levelFor = useCallback<PermissionsContextValue["levelFor"]>(
    (target, itemId, itemOwnerId) => {
      if (isGM) {
        return "edit";
      }
      return resolvePermissionLevel(state, target, itemId, {
        userId,
        itemOwnerId,
      });
    },
    [isGM, state, userId]
  );

  const canView = useCallback<PermissionsContextValue["canView"]>(
    (target, itemId, itemOwnerId) =>
      permissionAllows(levelFor(target, itemId, itemOwnerId), "view"),
    [levelFor]
  );
  const canMove = useCallback<PermissionsContextValue["canMove"]>(
    (target, itemId, itemOwnerId) =>
      permissionAllows(levelFor(target, itemId, itemOwnerId), "move"),
    [levelFor]
  );
  const canEdit = useCallback<PermissionsContextValue["canEdit"]>(
    (target, itemId, itemOwnerId) =>
      permissionAllows(levelFor(target, itemId, itemOwnerId), "edit"),
    [levelFor]
  );

  const itemRule = useCallback<PermissionsContextValue["itemRule"]>(
    (itemId) => state.items[itemId],
    [state]
  );

  const defaultRule = useCallback<PermissionsContextValue["defaultRule"]>(
    (target) => state.defaults[target] ?? {},
    [state]
  );

  const hasItemRule = useCallback<PermissionsContextValue["hasItemRule"]>(
    (itemId) => hasItemPermissionRule(state, itemId),
    [state]
  );

  const setRule = useCallback<PermissionsContextValue["setRule"]>(
    (target, itemId, patch) => {
      if (!isGM) {
        return;
      }
      onPermissionChange((current) =>
        setPermissionRule(current, target, itemId, patch)
      );
    },
    [isGM, onPermissionChange]
  );

  const setRules = useCallback<PermissionsContextValue["setRules"]>(
    (target, itemIds, patch) => {
      if (!isGM || itemIds.length === 0) {
        return;
      }
      onPermissionChange((current) =>
        setPermissionRuleForItems(current, target, itemIds, patch)
      );
    },
    [isGM, onPermissionChange]
  );

  const clearRules = useCallback<PermissionsContextValue["clearRules"]>(
    (itemIds) => {
      if (!isGM || itemIds.length === 0) {
        return;
      }
      onPermissionChange((current) =>
        clearPermissionRulesForItems(current, itemIds)
      );
    },
    [isGM, onPermissionChange]
  );

  const value = useMemo<PermissionsContextValue>(
    () => ({
      isGM,
      userId,
      state,
      players,
      levelFor,
      canView,
      canMove,
      canEdit,
      itemRule,
      defaultRule,
      hasItemRule,
      setRule,
      setRules,
      clearRules,
    }),
    [
      isGM,
      userId,
      state,
      players,
      levelFor,
      canView,
      canMove,
      canEdit,
      itemRule,
      defaultRule,
      hasItemRule,
      setRule,
      setRules,
      clearRules,
    ]
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextValue {
  return useContext(PermissionsContext);
}

/** 求解单个类别规则时用的工具，供非 React 场景（如工具函数）复用 */
export function resolveRuleForTarget(
  state: PermissionState,
  target: PermissionTarget,
  itemId?: string
): PermissionRule {
  return resolvePermissionRule(state, target, itemId);
}

export default PermissionsContext;
