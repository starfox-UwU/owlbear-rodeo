import { useState } from "react";
import { IconButton } from "theme-ui";

import SelectMapModal from "../../modals/SelectMapModal";
import SelectMapIcon from "../../icons/SelectMapIcon";

import { useMapData } from "../../contexts/MapDataContext";
import { useUserId } from "../../contexts/UserIdContext";
import {
  MapChangeEventHandler,
  MapResetEventHandler,
} from "../../types/Events";
import { Map } from "../../types/Map";
import { MapState } from "../../types/MapState";

import { useI18n } from "../../i18n";

type SelectMapButtonProps = {
  onMapChange: MapChangeEventHandler;
  onMapReset: MapResetEventHandler;
  currentMap: Map | null;
  currentMapState: MapState | null;
  disabled: boolean;
};

function SelectMapButton({
  onMapChange,
  onMapReset,
  currentMap,
  currentMapState,
  disabled,
}: SelectMapButtonProps) {
  const { t } = useI18n();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const { updateMapState } = useMapData();
  const userId = useUserId();
  function openModal() {
    if (currentMapState && currentMap && currentMap.owner === userId) {
      updateMapState(currentMapState.mapId, currentMapState);
    }
    setIsModalOpen(true);
  }

  function handleDone() {
    setIsModalOpen(false);
  }

  return (
    <>
      <IconButton
        aria-label={t("maps.selectMap")}
        title={t("maps.selectMap")}
        onClick={openModal}
        disabled={disabled}
      >
        <SelectMapIcon />
      </IconButton>
      <SelectMapModal
        isOpen={isModalOpen}
        onDone={handleDone}
        onMapChange={onMapChange}
        onMapReset={onMapReset}
        currentMap={currentMap}
      />
    </>
  );
}

export default SelectMapButton;
