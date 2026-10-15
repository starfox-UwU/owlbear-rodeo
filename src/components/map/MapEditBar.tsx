import { useState, useEffect } from "react";
import { Flex, Close, IconButton } from "theme-ui";

import { groupsFromIds, itemsFromGroups } from "../../helpers/group";

import ConfirmModal from "../../modals/ConfirmModal";

import ResetMapIcon from "../../icons/ResetMapIcon";
import RemoveMapIcon from "../../icons/RemoveMapIcon";

import { useGroup } from "../../contexts/GroupContext";
import { useMapData } from "../../contexts/MapDataContext";
import { useKeyboard } from "../../contexts/KeyboardContext";

import shortcuts from "../../shortcuts";
import { Map } from "../../types/Map";
import {
  MapChangeEventHandler,
  MapResetEventHandler,
} from "../../types/Events";

import { useI18n } from "../../i18n";

type MapEditBarProps = {
  currentMap: Map | null;
  disabled: boolean;
  onMapChange: MapChangeEventHandler;
  onMapReset: MapResetEventHandler;
  onLoad: (loading: boolean) => void;
};

function MapEditBar({
  currentMap,
  disabled,
  onMapChange,
  onMapReset,
  onLoad,
}: MapEditBarProps) {
  const { t } = useI18n();

  const [hasMapState, setHasMapState] = useState(false);

  const { maps, mapStates, removeMaps, resetMap } = useMapData();

  const { activeGroups, selectedGroupIds, onClearSelection } = useGroup();

  useEffect(() => {
    const selectedGroups = groupsFromIds(selectedGroupIds, activeGroups);
    const selectedMapStates = itemsFromGroups(
      selectedGroups,
      mapStates,
      "mapId"
    );

    let _hasMapState = false;
    for (let state of selectedMapStates) {
      if (
        Object.values(state.tokens).length > 0 ||
        Object.values(state.drawings).length > 0 ||
        Object.values(state.fogs).length > 0 ||
        Object.values(state.notes).length > 0
      ) {
        _hasMapState = true;
        break;
      }
    }

    setHasMapState(_hasMapState);
  }, [selectedGroupIds, mapStates, activeGroups]);

  function getSelectedMaps() {
    const selectedGroups = groupsFromIds(selectedGroupIds, activeGroups);
    return itemsFromGroups(selectedGroups, maps);
  }

  const [isMapsRemoveModalOpen, setIsMapsRemoveModalOpen] = useState(false);
  async function handleMapsRemove() {
    onLoad(true);
    setIsMapsRemoveModalOpen(false);
    const selectedMaps = getSelectedMaps();
    const selectedMapIds = selectedMaps.map((map) => map.id);
    onClearSelection();
    await removeMaps(selectedMapIds);
    // Removed the map from the map screen if needed
    if (currentMap && selectedMapIds.includes(currentMap.id)) {
      onMapChange(null, null);
    }
    onLoad(false);
  }

  const [isMapsResetModalOpen, setIsMapsResetModalOpen] = useState(false);
  async function handleMapsReset() {
    onLoad(true);
    setIsMapsResetModalOpen(false);
    const selectedMaps = getSelectedMaps();
    const selectedMapIds = selectedMaps.map((map) => map.id);
    for (let id of selectedMapIds) {
      const newState = await resetMap(id);
      // Reset the state of the current map if needed
      if (currentMap && currentMap.id === id) {
        onMapReset(newState);
      }
    }
    onLoad(false);
  }

  /**
   * Shortcuts
   */
  function handleKeyDown(event: KeyboardEvent) {
    if (disabled) {
      return;
    }
    if (shortcuts.delete(event)) {
      const selectedMaps = getSelectedMaps();
      if (selectedMaps.length > 0) {
        setIsMapsResetModalOpen(false);
        setIsMapsRemoveModalOpen(true);
      }
    }
  }

  useKeyboard(handleKeyDown);

  if (selectedGroupIds.length === 0) {
    return null;
  }

  return (
    <Flex
      sx={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: "space-between",
      }}
      bg="overlay"
    >
      <Close
        title={t("maps.clearSelection")}
        aria-label={t("maps.clearSelection")}
        onClick={() => onClearSelection()}
      />
      <Flex>
        <IconButton
          aria-label={t("maps.resetSelected")}
          title={t("maps.resetSelected")}
          onClick={() => setIsMapsResetModalOpen(true)}
          disabled={!hasMapState}
        >
          <ResetMapIcon />
        </IconButton>
        <IconButton
          aria-label={t("maps.removeSelected")}
          title={t("maps.removeSelected")}
          onClick={() => setIsMapsRemoveModalOpen(true)}
        >
          <RemoveMapIcon />
        </IconButton>
      </Flex>
      <ConfirmModal
        isOpen={isMapsResetModalOpen}
        onRequestClose={() => setIsMapsResetModalOpen(false)}
        onConfirm={handleMapsReset}
        confirmText={t("common.reset")}
        label={t("maps.resetSelected")}
        description={t("maps.resetSelectedDescription")}
      />
      <ConfirmModal
        isOpen={isMapsRemoveModalOpen}
        onRequestClose={() => setIsMapsRemoveModalOpen(false)}
        onConfirm={handleMapsRemove}
        confirmText={t("common.remove")}
        label={t("maps.removeSelected")}
        description={t("maps.removeSelectedDescription")}
      />
    </Flex>
  );
}

export default MapEditBar;
