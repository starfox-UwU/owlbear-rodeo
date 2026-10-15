import { Flex, IconButton, Text } from "theme-ui";
import { useMedia } from "react-media";

import RadioIconButton from "../RadioIconButton";

import FogBrushIcon from "../../icons/FogBrushIcon";
import FogPolygonIcon from "../../icons/FogPolygonIcon";
import FogRemoveIcon from "../../icons/FogRemoveIcon";
import FogRectangleIcon from "../../icons/FogRectangleIcon";
import FogToggleIcon from "../../icons/FogToggleIcon";
import FogCutOnIcon from "../../icons/FogCutOnIcon";
import FogCutOffIcon from "../../icons/FogCutOffIcon";
import FogPreviewOffIcon from "../../icons/FogPreviewOffIcon";
import FogPreviewOnIcon from "../../icons/FogPreviewOnIcon";
import ResetMapIcon from "../../icons/ResetMapIcon";
import TokenShowIcon from "../../icons/TokenShowIcon";

import ToolSection from "./shared/ToolSection";

import Divider from "../Divider";
import EraseAllButton from "./shared/EraseAllButton";
import Slider from "../Slider";

import { useKeyboard } from "../../contexts/KeyboardContext";

import shortcuts from "../../shortcuts";

import { useI18n } from "../../i18n";

import {
  FogToolSettings as FogToolSettingsType,
  FogToolType,
} from "../../types/Fog";

type FogToolSettingsProps = {
  settings: FogToolSettingsType;
  onSettingChange: (change: Partial<FogToolSettingsType>) => void;
  onToolAction?: (action: string) => void;
  disabledActions?: string[];
  fogEnabled?: boolean;
  showGmOpacity?: boolean;
  gmOpacity?: number;
  showExplored?: boolean;
};

function FogToolSettings({
  settings,
  onSettingChange,
  onToolAction,
  disabledActions = [],
  fogEnabled = true,
  showGmOpacity = false,
  gmOpacity = 0.35,
  showExplored = false,
}: FogToolSettingsProps) {
  const { t } = useI18n();

  const exploredVisible = !!showExplored;
  const previewOnDrag = !!settings.previewOnDrag;
  const autoVisionOnDrop = !!settings.autoVisionOnDrop;
  // Keyboard shortcuts
  function handleKeyDown(event: KeyboardEvent) {
    if (shortcuts.fogPolygon(event)) {
      onSettingChange({ type: "polygon" });
    } else if (shortcuts.fogBrush(event)) {
      onSettingChange({ type: "brush" });
    } else if (shortcuts.fogErase(event)) {
      onSettingChange({ type: "remove" });
    } else if (shortcuts.fogRectangle(event)) {
      onSettingChange({ type: "rectangle" });
    }
  }

  useKeyboard(handleKeyDown);

  const isSmallScreen = useMedia({ query: "(max-width: 799px)" });
  const drawTools = [
    {
      id: "polygon",
      title: t("tools.fogTool.pen"),
      isSelected: settings.type === "polygon",
      icon: <FogPolygonIcon />,
    },
    {
      id: "rectangle",
      title: t("tools.fogTool.line"),
      isSelected: settings.type === "rectangle",
      icon: <FogRectangleIcon />,
    },
    {
      id: "brush",
      title: t("tools.fogTool.brush"),
      isSelected: settings.type === "brush",
      icon: <FogBrushIcon />,
    },
  ];

  return (
    <Flex sx={{ alignItems: "center" }}>
      <RadioIconButton
        title={
          fogEnabled ? t("tools.fogTool.disableFog") : t("tools.fogTool.enableFog")
        }
        onClick={() => onToolAction?.("toggleFogEnabled")}
        isSelected={fogEnabled}
      >
        <FogToggleIcon />
      </RadioIconButton>
      <Divider vertical />
      <RadioIconButton
        title={
          exploredVisible
            ? t("tools.fogTool.hideExplored")
            : t("tools.fogTool.showExplored")
        }
        onClick={() => onToolAction?.("toggleExplored")}
        isSelected={exploredVisible}
      >
        {exploredVisible ? <FogCutOnIcon /> : <FogCutOffIcon />}
      </RadioIconButton>
      <IconButton
        aria-label={t("tools.fogTool.resetExplored")}
        title={t("tools.fogTool.resetExplored")}
        onClick={() => onToolAction?.("resetExplored")}
      >
        <ResetMapIcon />
      </IconButton>
      <Divider vertical />
      <IconButton
        aria-label={
          previewOnDrag
            ? t("tools.fogTool.disableLightingPreview")
            : t("tools.fogTool.enableLightingPreview")
        }
        title={
          previewOnDrag
            ? t("tools.fogTool.disableLightingPreview")
            : t("tools.fogTool.enableLightingPreview")
        }
        onClick={() => onSettingChange({ previewOnDrag: !previewOnDrag })}
        sx={{ color: previewOnDrag ? "primary" : "text" }}
      >
        {previewOnDrag ? <FogPreviewOnIcon /> : <FogPreviewOffIcon />}
      </IconButton>
      <IconButton
        aria-label={
          autoVisionOnDrop
            ? t("tools.fogTool.disableAutoVision")
            : t("tools.fogTool.enableAutoVision")
        }
        title={
          autoVisionOnDrop
            ? t("tools.fogTool.disableAutoVision")
            : t("tools.fogTool.enableAutoVision")
        }
        onClick={() => onSettingChange({ autoVisionOnDrop: !autoVisionOnDrop })}
        sx={{ color: autoVisionOnDrop ? "primary" : "text" }}
      >
        <TokenShowIcon />
      </IconButton>
      {showGmOpacity && (
        <>
          <Divider vertical />
          <Flex sx={{ alignItems: "center" }}>
            <Text variant="body2" sx={{ mr: 2 }}>
              {t("tools.fogTool.gmFog")}
            </Text>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={gmOpacity}
              onChange={(e) =>
                onToolAction?.(
                  `setGmOpacity:${parseFloat(e.target.value) || 0}`
                )
              }
              labelFunc={(value) => `${Math.round(value * 100)}%`}
              ml={2}
              mr={3}
            />
          </Flex>
        </>
      )}
      <Divider vertical />
      <ToolSection
        tools={drawTools}
        onToolClick={(tool) =>
          onSettingChange({ type: tool.id as FogToolType })
        }
        collapse={isSmallScreen}
      />
      <Divider vertical />
      <RadioIconButton
        title={t("tools.fogTool.eraseWall")}
        onClick={() => onSettingChange({ type: "remove" })}
        isSelected={settings.type === "remove"}
      >
        <FogRemoveIcon />
      </RadioIconButton>
      <Divider vertical />
      <EraseAllButton
        onToolAction={onToolAction || (() => {})}
        disabled={disabledActions.includes("eraseAll")}
      />
    </Flex>
  );
}

export default FogToolSettings;
