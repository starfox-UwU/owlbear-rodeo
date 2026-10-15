import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Flex, IconButton, Input, Text } from "theme-ui";
import { useToasts } from "react-toast-notifications";
import { v4 as uuid } from "uuid";

import MapMenu from "../map/MapMenu";

import usePrevious from "../../hooks/usePrevious";

import LockIcon from "../../icons/TokenLockIcon";
import UnlockIcon from "../../icons/TokenUnlockIcon";
import ShowIcon from "../../icons/TokenShowIcon";
import HideIcon from "../../icons/TokenHideIcon";
import CopyIcon from "../../icons/CopyIcon";
import PasteIcon from "../../icons/PasteIcon";

import { useUserId } from "../../contexts/UserIdContext";
import { usePermissions } from "../../contexts/PermissionsContext";

import Select from "../Select";
import PermissionIcon from "../../icons/PermissionIcon";
import { usePermissionLevelOptions } from "../permission/PermissionEditor";

import { PermissionLevel } from "../../types/Permission";

import {
  SelectionItemsChangeEventHandler,
  RequestCloseEventHandler,
  SelectionItemsCreateEventHandler,
} from "../../types/Events";
import { Map } from "../../types/Map";
import { Selection, SelectionItem } from "../../types/Select";
import { TokenState, TokenStates } from "../../types/TokenState";
import { Note, Notes } from "../../types/Note";
import { getSelectionPoints } from "../../helpers/selection";
import Vector2 from "../../helpers/Vector2";
import { useMapStage } from "../../contexts/MapStageContext";
import { MapState } from "../../types/MapState";
import { isMapState } from "../../validators/MapState";
import { isSelection } from "../../validators/Selection";
import { getRelativePointerPosition } from "../../helpers/konva";
import { useKeyboard } from "../../contexts/KeyboardContext";
import shortcuts from "../../shortcuts";
import { clipboardSupported } from "../../helpers/shared";
import { buildNextAttributes, parseNumericExpression } from "../../helpers/tokenAttributes";
import { useI18n } from "../../i18n";

type SelectionMenuProps = {
  isOpen: boolean;
  active: boolean;
  effectMode: boolean;
  onRequestClose: RequestCloseEventHandler;
  onRequestOpen: () => void;
  selection: Selection | null;
  onSelectionChange: React.Dispatch<React.SetStateAction<Selection | null>>;
  onSelectionItemsChange: SelectionItemsChangeEventHandler;
  onSelectionItemsCreate: SelectionItemsCreateEventHandler;
  map: Map | null;
  mapState: MapState | null;
};

function SelectionMenu({
  isOpen,
  active,
  effectMode,
  onRequestClose,
  onRequestOpen,
  selection,
  onSelectionChange,
  onSelectionItemsChange,
  onSelectionItemsCreate,
  map,
  mapState,
}: SelectionMenuProps) {
  const { t } = useI18n();
  const { addToast } = useToasts();
  const levelOptions = usePermissionLevelOptions();

  const userId = useUserId();
  const permissions = usePermissions();

  const wasOpen = usePrevious(isOpen);

  const mapStageRef = useMapStage();

  const [menuLeft, setMenuLeft] = useState(0);
  const [menuTop, setMenuTop] = useState(0);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [bulkLevel, setBulkLevel] = useState<PermissionLevel>("view");

  const selectedTokenIds = useMemo(
    () =>
      selection
        ? selection.items
            .filter((item) => item.type === "token")
            .map((item) => item.id)
        : [],
    [selection]
  );
  const selectedNoteIds = useMemo(
    () =>
      selection
        ? selection.items
            .filter((item) => item.type === "note")
            .map((item) => item.id)
        : [],
    [selection]
  );

  function handleApplyBulkPermission() {
    permissions.setRules("tokens", selectedTokenIds, { everyone: bulkLevel });
    permissions.setRules("notes", selectedNoteIds, { everyone: bulkLevel });
    setPermissionOpen(false);
    onRequestClose();
  }

  function handleClearBulkPermission() {
    permissions.clearRules([...selectedTokenIds, ...selectedNoteIds]);
  }

  const selectionMenuWidth =
    selection === null ? 48 : effectMode || permissionOpen ? 260 : 156;

  // 每次重新打开菜单都收起权限区块，避免上一次的展开状态串味
  useEffect(() => {
    if (isOpen && !wasOpen) {
      setPermissionOpen(false);
    }
  }, [isOpen, wasOpen]);

  useEffect(() => {
    const mapStage = mapStageRef.current;
    if (isOpen && !wasOpen && mapStage) {
      const mapImage = mapStage.findOne("#mapImage");
      if (!mapImage) {
        return;
      }
      let menuPosition = { x: 0, y: 0 };
      if (selection) {
        const points = getSelectionPoints(selection);
        const bounds = Vector2.getBoundingBox(points);

        menuPosition = new Vector2(
          bounds.center.x + selection.x,
          bounds.max.y + selection.y
        );
        menuPosition = Vector2.multiply(menuPosition, {
          x: mapImage.width(),
          y: mapImage.height(),
        });
      } else {
        const position = getRelativePointerPosition(mapImage);
        if (position) {
          menuPosition = position;
        }
      }

      const transform = mapImage.getAbsoluteTransform().copy();
      const absolutePosition = transform.point(menuPosition);
      const mapElement = document.querySelector(".map");
      if (mapElement) {
        const mapRect = mapElement.getBoundingClientRect();
        setMenuLeft(mapRect.left + absolutePosition.x - selectionMenuWidth / 2);
        setMenuTop(mapRect.top + absolutePosition.y + 12);
      }
    }
  }, [isOpen, selection, wasOpen, mapStageRef, selectionMenuWidth]);

  // Open paste menu if clicking without a selection
  // Ensure that paste menu is closed when clicking and that the click hasn't moved far
  const openOnDownRef = useRef(false);
  const downPositionRef = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (!active) {
      return;
    }
    function handlePointerDown(event: PointerEvent) {
      openOnDownRef.current = isOpen || !!selection;
      downPositionRef.current = { x: event.clientX, y: event.clientY };
    }
    function handlePointerUp(event: MouseEvent | TouchEvent) {
      let position;
      if (event instanceof MouseEvent) {
        position = { x: event.clientX, y: event.clientY };
      } else {
        position = {
          x: event.changedTouches[0].clientX,
          y: event.changedTouches[0].clientY,
        };
      }
      const deltaPosition = Vector2.distance(position, downPositionRef.current);
      if (
        !openOnDownRef.current &&
        !selection &&
        deltaPosition < 10 &&
        event.target instanceof HTMLCanvasElement
      ) {
        onRequestOpen();
      }
    }
    const mapElement = document.querySelector<HTMLElement>(".map");
    mapElement?.addEventListener("pointerdown", handlePointerDown);
    mapElement?.addEventListener("mouseup", handlePointerUp);
    mapElement?.addEventListener("touchend", handlePointerUp);

    return () => {
      mapElement?.removeEventListener("pointerdown", handlePointerDown);
      mapElement?.removeEventListener("mouseup", handlePointerUp);
      mapElement?.removeEventListener("touchend", handlePointerUp);
    };
  }, [isOpen, active, selection, onRequestOpen]);

  function handleModalContent(node: HTMLElement) {
    if (node) {
      // Ensure menu is in bounds
      const nodeRect = node.getBoundingClientRect();
      const mapElement = document.querySelector(".map");
      if (mapElement) {
        const mapRect = mapElement.getBoundingClientRect();
        setMenuLeft((prevLeft) =>
          Math.min(
            mapRect.right - nodeRect.width,
            Math.max(mapRect.left, prevLeft)
          )
        );
        setMenuTop((prevTop) =>
          Math.min(mapRect.bottom - nodeRect.height, prevTop)
        );
      }
    }
  }

  function updateSelectedItems(change: Partial<TokenState> | Partial<Note>) {
    if (selection) {
      const tokenChanges: Record<string, Partial<TokenState>> = {};
      const noteChanges: Record<string, Partial<Note>> = {};
      for (let item of selection.items) {
        if (item.type === "token") {
          tokenChanges[item.id] = change;
        } else {
          noteChanges[item.id] = change;
        }
      }
      onSelectionItemsChange(tokenChanges, noteChanges);
    }
  }

  const [itemsVisible, setItemsVisible] = useState(false);
  function handleVisibleChange() {
    updateSelectedItems({ visible: !itemsVisible });
    setItemsVisible(!itemsVisible);
  }

  const [itemsLocked, setItemsLocked] = useState(false);
  function handleLockChange() {
    updateSelectedItems({ locked: !itemsLocked });
    setItemsLocked(!itemsLocked);
  }

  function handleApplyEffect() {
    if (!selection || !mapState) {
      addToast(t("tokens.selection.noSelection"), { appearance: "warning" });
      return;
    }
    const label = effectLabel.trim();
    const expression = effectExpression.trim();
    if (!expression) {
      addToast(t("tokens.selection.enterExpression"), { appearance: "error" });
      return;
    }
    const tokenChanges: Record<string, Partial<TokenState>> = {};
    let affected = 0;
    for (let item of selection.items) {
      if (item.type !== "token") {
        continue;
      }
      const tokenState = mapState.tokens[item.id];
      if (!tokenState || !tokenState.attributes) {
        continue;
      }
      const bars = tokenState.attributes.bars || [];
      const barIndex = label
        ? bars.findIndex(
            (bar) => bar.label.toLowerCase() === label.toLowerCase()
          )
        : bars.length > 0
        ? 0
        : -1;
      if (barIndex < 0) {
        continue;
      }
      const bar = bars[barIndex];
      const result = parseNumericExpression(bar.current, expression);
      if (!result.ok) {
        addToast(t(result.errorKey), { appearance: "error" });
        return;
      }
      const nextBars = bars.map((existing, index) =>
        index === barIndex ? { ...existing, current: result.value } : existing
      );
      const nextAttributes = buildNextAttributes(
        tokenState.attributes,
        nextBars,
        tokenState.attributes.values,
        userId || "unknown"
      );
      tokenChanges[tokenState.id] = { attributes: nextAttributes };
      affected += 1;
    }
    if (affected === 0) {
      addToast(t("tokens.selection.noMatchingAttributes"), { appearance: "warning" });
      return;
    }
    onSelectionItemsChange(tokenChanges, {});
    addToast(
      affected === 1
        ? t("tokens.selection.updatedTokens", { count: affected })
        : t("tokens.selection.updatedTokensPlural", { count: affected }),
      { appearance: "success" }
    );
  }

  const [effectLabel, setEffectLabel] = useState("HP");
  const [effectExpression, setEffectExpression] = useState("+0");

  // Update lock and visible state depending on selected items
  useEffect(() => {
    if (isOpen && selection && mapState) {
      let allVisible = true;
      let allLocked = true;
      for (let item of selection.items) {
        if (item.type === "token") {
          const tokenState = mapState.tokens[item.id];
          if (!tokenState.visible) {
            allVisible = false;
          }
          if (!tokenState.locked) {
            allLocked = false;
          }
        } else {
          const note = mapState.notes[item.id];
          if (!note.visible) {
            allVisible = false;
          }
          if (!note.locked) {
            allLocked = false;
          }
        }
      }
      setItemsVisible(allVisible);
      setItemsLocked(allLocked);
    }
  }, [mapState, selection, isOpen]);

  function addSuccessToast(
    message: string,
    tokens?: TokenStates,
    notes?: Notes
  ) {
    const numTokens = tokens ? Object.keys(tokens).length : 0;
    const numNotes = notes ? Object.keys(notes).length : 0;
    const tokenText =
      numTokens === 1
        ? t("tokens.selection.countTokens", { count: numTokens })
        : t("tokens.selection.countTokensPlural", { count: numTokens });
    const noteText =
      numNotes === 1
        ? t("tokens.selection.countNotes", { count: numNotes })
        : t("tokens.selection.countNotesPlural", { count: numNotes });
    if (numTokens > 0 && numNotes > 0) {
      addToast(
        t("tokens.selection.copiedWithBoth", {
          message,
          tokens: tokenText,
          notes: noteText,
        })
      );
    } else if (numTokens > 0) {
      addToast(
        t("tokens.selection.copiedWithTokens", {
          message,
          tokens: tokenText,
        })
      );
    } else if (numNotes > 0) {
      addToast(
        t("tokens.selection.copiedWithNotes", {
          message,
          notes: noteText,
        })
      );
    }
  }

  // Keep a local copy of the clipboard if the device doesn't support the clipboard api i.e. iOS
  const localClipboardDataRef = useRef<string>("");
  async function handleCopy() {
    let version = __APP_VERSION__;
    if (!version || !selection || !mapState) {
      return;
    }
    let clipboard: { version: string; data: MapState; selection: Selection } = {
      version,
      selection,
      data: {
        tokens: {},
        notes: {},
        drawings: {},
        templates: {},
        editFlags: [],
        fogs: {},
        tokenNotes: {},
        mapId: mapState.mapId,
      },
    };
    for (let item of selection.items) {
      // 只能复制自己有编辑权的物件，避免把「可移动」变成可以刷物件
      if (item.type === "token" && clipboard.data.tokens) {
        const token = mapState.tokens[item.id];
        if (token && permissions.canEdit("tokens", item.id, token.owner)) {
          clipboard.data.tokens[item.id] = token;
        }
      } else if (item.type === "note" && clipboard.data.notes) {
        const note = mapState.notes[item.id];
        if (note && permissions.canEdit("notes", item.id, note.ownerId)) {
          clipboard.data.notes[item.id] = note;
        }
      }
    }
    if (await clipboardSupported()) {
      await navigator.clipboard.writeText(JSON.stringify(clipboard));
    } else {
      localClipboardDataRef.current = JSON.stringify(clipboard);
    }
    addSuccessToast(t("common.copied"), clipboard.data.tokens, clipboard.data.notes);
  }

  async function handlePaste() {
    let version = __APP_VERSION__;

    if (!version || !mapState) {
      return;
    }
    try {
      let clipboardText;
      if (await clipboardSupported()) {
        clipboardText = await navigator.clipboard.readText();
      } else {
        clipboardText = localClipboardDataRef.current;
      }
      const clipboard = JSON.parse(clipboardText);
      const clipboardData = clipboard?.data;
      if (clipboardData && typeof clipboardData === "object") {
        if (!clipboardData.templates) {
          clipboardData.templates = {};
        }
        if (!clipboardData.tokenNotes) {
          clipboardData.tokenNotes = {};
        }
      }
      if (
        clipboard.version === version &&
        isMapState(clipboardData) &&
        isSelection(clipboard.selection)
      ) {
        // Find new selection position
        const mapStage = mapStageRef.current;
        const mapImage = mapStage?.findOne("#mapImage");
        if (!mapImage) {
          return;
        }
        const position = getRelativePointerPosition(mapImage);
        if (!position) {
          return;
        }
        const normalizedPosition = Vector2.divide(position, {
          x: mapImage.width(),
          y: mapImage.height(),
        });

        const clipboardSelection = clipboard.selection as Selection;
        const points = getSelectionPoints(clipboardSelection);
        const center = Vector2.centroid(points);

        let selectionDelta = Vector2.subtract(normalizedPosition, center);

        const clipboardState = clipboard.data as MapState;
        let tokenStates: TokenState[] = [];
        let notes: Note[] = [];
        let selectionItems: SelectionItem[] = [];
        for (let token of Object.values(clipboardState.tokens)) {
          const newId = uuid();
          tokenStates.push({
            ...token,
            x: token.x + selectionDelta.x,
            y: token.y + selectionDelta.y,
            id: newId,
          });
          selectionItems.push({ id: newId, type: "token" });
        }
        for (let note of Object.values(clipboardState.notes)) {
          const newId = uuid();
          notes.push({
            ...note,
            x: note.x + selectionDelta.x,
            y: note.y + selectionDelta.y,
            id: newId,
          });
          selectionItems.push({ id: newId, type: "note" });
        }
        onSelectionItemsCreate(tokenStates, notes);

        onSelectionChange({
          ...clipboardSelection,
          items: selectionItems,
          x: clipboardSelection.x + selectionDelta.x,
          y: clipboardSelection.y + selectionDelta.y,
        });

        onRequestClose();
      } else {
        addToast(t("tokens.selection.invalidData"));
      }
    } catch {
      addToast(t("tokens.selection.unableToPaste"));
    }  }

  function handleKeyDown(event: KeyboardEvent) {
    if (active) {
      if (selection && shortcuts.copy(event)) {
        handleCopy();
      }
      if (shortcuts.paste(event)) {
        handlePaste();
      }
    }
  }

  useKeyboard(handleKeyDown);

  return (
    <MapMenu
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      top={`${menuTop}px`}
      left={`${menuLeft}px`}
      onModalContent={handleModalContent}
    >
      <Box sx={{ width: `${selectionMenuWidth}px`, overflow: "hidden" }} p={1}>
        <Flex sx={{ alignItems: "center", justifyContent: "space-around" }}>
          {selection ? (
            <>
              {/* Only show hide and lock token actions to map owners */}
              {map && map.owner === userId && (
                <>
                  <IconButton
                    onClick={handleVisibleChange}
                    title={itemsVisible ? t("tokens.selection.hideItems") : t("tokens.selection.showItems")}
                    aria-label={itemsVisible ? t("tokens.selection.hideItems") : t("tokens.selection.showItems")}
                  >
                    {itemsVisible ? <ShowIcon /> : <HideIcon />}
                  </IconButton>
                  <IconButton
                    onClick={handleLockChange}
                    title={itemsLocked ? t("tokens.selection.unlockItems") : t("tokens.selection.lockItems")}
                    aria-label={itemsLocked ? t("tokens.selection.unlockItems") : t("tokens.selection.lockItems")}
                  >
                    {itemsLocked ? <LockIcon /> : <UnlockIcon />}
                  </IconButton>
                </>
              )}
              <IconButton
                title={t("tokens.selection.copyItems")}
                aria-label={t("tokens.selection.copyItems")}
                onClick={handleCopy}
              >
                <CopyIcon />
              </IconButton>
              {permissions.isGM && (
                <IconButton
                  onClick={() => setPermissionOpen((prev) => !prev)}
                  title={t("permissions.title")}
                  aria-label={t("permissions.title")}
                >
                  <PermissionIcon />
                </IconButton>
              )}
            </>
          ) : (
            <IconButton
              title={t("tokens.selection.pasteItems")}
              aria-label={t("tokens.selection.pasteItems")}
              onClick={handlePaste}
            >
              <PasteIcon />
            </IconButton>
          )}
        </Flex>
        {permissions.isGM && selection && permissionOpen && (
          <Box mt={2}>
            <Text variant="body2">{t("permissions.title")}</Text>
            <Text variant="caption" sx={{ display: "block", opacity: 0.7, mt: 1 }}>
              {t("permissions.selectionHint")}
            </Text>
            <Box mt={1}>
              <Select
                inputId="selection-permission-level"
                isSearchable={false}
                options={levelOptions.player}
                value={levelOptions.player.find(
                  (option) => option.value === bulkLevel
                )}
                onChange={(option: any) =>
                  option && setBulkLevel(option.value as PermissionLevel)
                }
              />
            </Box>
            <Flex mt={2} sx={{ gap: 2 }}>
              <Button onClick={handleApplyBulkPermission} sx={{ flexGrow: 1 }}>
                {t("permissions.applyToSelection")}
              </Button>
              <Button variant="secondary" onClick={handleClearBulkPermission}>
                {t("permissions.clearItem")}
              </Button>
            </Flex>
          </Box>
        )}
        {effectMode && selection && (
          <Box mt={2}>
            <Text variant="body2">{t("tokens.selection.effect.heading")}</Text>
            <Box mt={1}>
              <Text variant="body2" sx={{ opacity: 0.8 }}>
                {t("tokens.selection.effect.targetBar")}
              </Text>
              <Input
                value={effectLabel}
                onChange={(e) => setEffectLabel(e.target.value)}
                sx={{ width: "100%", px: 1, py: "2px", mt: 1 }}
              />
            </Box>
            <Box mt={2}>
              <Text variant="body2" sx={{ opacity: 0.8 }}>
                {t("tokens.selection.effect.expression")}
              </Text>
              <Input
                value={effectExpression}
                onChange={(e) => setEffectExpression(e.target.value)}
                sx={{ width: "100%", px: 1, py: "2px", mt: 1 }}
              />
            </Box>
            <Box mt={2}>
              <IconButton
                onClick={handleApplyEffect}
                aria-label={t("tokens.selection.effect.apply")}
                title={t("tokens.selection.effect.apply")}
                sx={{
                  width: "100%",
                  justifyContent: "center",
                  backgroundColor: "muted",
                }}
              >
                <Text as="span" sx={{ fontSize: "14px" }}>
                  {t("tokens.selection.effect.apply")}
                </Text>
              </IconButton>
            </Box>
          </Box>
        )}
      </Box>
    </MapMenu>
  );
}

export default SelectionMenu;
