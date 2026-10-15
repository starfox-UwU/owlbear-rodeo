import { useCallback, useEffect, useState } from "react";
import { v4 as uuid } from "uuid";

import SelectionDragOverlay from "../components/selection/SelectionDragOverlay";
import SelectionMenu from "../components/selection/SelectionMenu";
import SelectTool from "../components/tools/SelectTool";
import { useBlur, useKeyboard } from "../contexts/KeyboardContext";
import { usePermissions } from "../contexts/PermissionsContext";
import { filterChangesByPermission } from "../helpers/permissions";
import shortcuts from "../shortcuts";
import {
  SelectionItemsChangeEventHandler,
  SelectionItemsCreateEventHandler,
  SelectionItemsRemoveEventHandler,
} from "../types/Events";
import { Map, MapToolId } from "../types/Map";
import { MapState } from "../types/MapState";
import { Note } from "../types/Note";
import { Selection } from "../types/Select";
import { SelectToolSettings } from "../types/Select";
import { TokenState } from "../types/TokenState";

function useMapSelection(
  map: Map | null,
  mapState: MapState | null,
  onSelectionItemsChange: SelectionItemsChangeEventHandler,
  onSelectionItemsRemove: SelectionItemsRemoveEventHandler,
  onSelectionItemsCreate: SelectionItemsCreateEventHandler,
  selectedToolId: MapToolId,
  settings: SelectToolSettings
) {
  const permissions = usePermissions();

  const disabledTokens: Record<string, boolean> = {};
  const disabledNotes: Record<string, boolean> = {};
  if (mapState && map) {
    for (const token of Object.values(mapState.tokens)) {
      if (!permissions.canMove("tokens", token.id, token.owner)) {
        disabledTokens[token.id] = true;
      }
    }
    for (const note of Object.values(mapState.notes)) {
      if (!permissions.canMove("notes", note.id, note.ownerId)) {
        disabledNotes[note.id] = true;
      }
    }
  }

  /**
   * 框选拖拽、效果工具改数值都走这里，同样是按权限过滤：
   * 「可移动」只能改位置，改数值 / 名目需要「可完全编辑」。
   */
  const guardedSelectionItemsChange: SelectionItemsChangeEventHandler =
    useCallback(
      (tokenChanges, noteChanges) => {
        const allowedTokens = filterChangesByPermission<Partial<TokenState>>(
          tokenChanges,
          (id) => permissions.levelFor("tokens", id, mapState?.tokens[id]?.owner)
        );
        const allowedNotes = filterChangesByPermission<Partial<Note>>(
          noteChanges,
          (id) => permissions.levelFor("notes", id, mapState?.notes[id]?.ownerId)
        );
        if (
          Object.keys(allowedTokens).length === 0 &&
          Object.keys(allowedNotes).length === 0
        ) {
          return;
        }
        onSelectionItemsChange(allowedTokens, allowedNotes);
      },
      [mapState, onSelectionItemsChange, permissions]
    );

  const [isSelectionMenuOpen, setIsSelectionMenuOpen] =
    useState<boolean>(false);
  const [isSelectionDragging, setIsSelectionDragging] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);

  function handleSelectionMenuOpen(open: boolean) {
    setIsSelectionMenuOpen(open);
  }

  const active = selectedToolId === "select" || selectedToolId === "effect";

  // Remove selection when changing tools
  useEffect(() => {
    if (!active) {
      setSelection(null);
      setIsSelectionMenuOpen(false);
    }
  }, [active]);

  // Remove selection when changing maps
  useEffect(() => {
    setSelection(null);
    setIsSelectionMenuOpen(false);
  }, [map]);

  function handleSelectionDragStart() {
    if (duplicateSelection && selection) {
      const tokenStates: TokenState[] = [];
      const notes: Note[] = [];
      for (let item of selection.items) {
        if (item.type === "token") {
          const token = mapState?.tokens[item.id];
          // 只有能编辑的物件才允许复制，
          // 否则「可移动」等级会变成可以无限刷物件
          if (
            token &&
            !token.locked &&
            permissions.canEdit("tokens", token.id, token.owner)
          ) {
            tokenStates.push({ ...token, id: uuid() });
          }
        } else {
          const note = mapState?.notes[item.id];
          if (
            note &&
            !note.locked &&
            permissions.canEdit("notes", note.id, note.ownerId)
          ) {
            notes.push({ ...note, id: uuid() });
          }
        }
      }
      onSelectionItemsCreate(tokenStates, notes);
    }
    setIsSelectionDragging(true);
  }

  function handleSelectionDragEnd() {
    setIsSelectionDragging(false);
  }

  function handleSelectionItemsRemove(
    tokenStateIds: string[],
    noteIds: string[]
  ) {
    // 选中的物件可能只是「可移动」，删除前再按编辑权限过滤一次
    const removableTokens = tokenStateIds.filter((id) => {
      const token = mapState?.tokens[id];
      return !!token && permissions.canEdit("tokens", id, token.owner);
    });
    const removableNotes = noteIds.filter((id) => {
      const note = mapState?.notes[id];
      return !!note && permissions.canEdit("notes", id, note.ownerId);
    });
    setSelection(null);
    if (removableTokens.length === 0 && removableNotes.length === 0) {
      return;
    }
    onSelectionItemsRemove(removableTokens, removableNotes);
  }

  const [duplicateSelection, setDuplicateSelection] = useState(false);
  function handleKeyDown(event: KeyboardEvent) {
    if (shortcuts.duplicate(event)) {
      setDuplicateSelection(true);
    }
    if (shortcuts.delete(event) && selection && active) {
      const tokenIds: string[] = [];
      const noteIds: string[] = [];
      for (let item of selection.items) {
        if (item.type === "token") {
          tokenIds.push(item.id);
        } else {
          noteIds.push(item.id);
        }
      }
      handleSelectionItemsRemove(tokenIds, noteIds);
      setIsSelectionMenuOpen(false);
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    if (shortcuts.duplicate(event)) {
      setDuplicateSelection(false);
    }
  }

  function handleBlur() {
    setDuplicateSelection(false);
  }

  useKeyboard(handleKeyDown, handleKeyUp);
  useBlur(handleBlur);

  const selectionTool = map ? (
    <SelectTool
      active={active}
      toolSettings={settings}
      onSelectionItemsChange={guardedSelectionItemsChange}
      selection={selection}
      onSelectionChange={setSelection}
      onSelectionMenuOpen={handleSelectionMenuOpen}
      onSelectionDragStart={handleSelectionDragStart}
      onSelectionDragEnd={handleSelectionDragEnd}
      disabledTokens={disabledTokens}
      disabledNotes={disabledNotes}
      map={map}
    />
  ) : null;

  const selectionMenu = (
    <SelectionMenu
      isOpen={isSelectionMenuOpen}
      active={active}
      effectMode={selectedToolId === "effect"}
      onRequestClose={() => setIsSelectionMenuOpen(false)}
      onRequestOpen={() => setIsSelectionMenuOpen(true)}
      selection={selection}
      onSelectionChange={setSelection}
      onSelectionItemsChange={guardedSelectionItemsChange}
      onSelectionItemsCreate={onSelectionItemsCreate}
      map={map}
      mapState={mapState}
    />
  );

  const selectionDragOverlay = selection ? (
    <SelectionDragOverlay
      dragging={isSelectionDragging}
      selection={selection}
      onSelectionItemsRemove={handleSelectionItemsRemove}
    />
  ) : null;

  return { selectionTool, selectionMenu, selectionDragOverlay };
}

export default useMapSelection;
