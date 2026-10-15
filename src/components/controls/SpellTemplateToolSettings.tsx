import { MouseEventHandler, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Box, Flex, Input, Label, SxProp, IconButton, Button } from "theme-ui";
import { useMedia } from "react-media";

import ToolSection from "./shared/ToolSection";
import Divider from "../Divider";
import Select from "../Select";
import MapMenu from "../map/MapMenu";

import BrushRectangleIcon from "../../icons/BrushRectangleIcon";
import BrushCircleIcon from "../../icons/BrushCircleIcon";
import BrushLineIcon from "../../icons/BrushLineIcon";
import BrushTriangleIcon from "../../icons/BrushTriangleIcon";
import FogPreviewOffIcon from "../../icons/FogPreviewOffIcon";
import FogPreviewOnIcon from "../../icons/FogPreviewOnIcon";
import SpellTemplateDragToolIcon from "../../icons/SpellTemplateDragToolIcon";
import EraseAllIcon from "../../icons/EraseAllIcon";
import RemoveTokenIcon from "../../icons/RemoveTokenIcon";
import SettingsIcon from "../../icons/SettingsIcon";

import colors, { colorOptions, Color } from "../../helpers/colors";

import { useI18n } from "../../i18n";

import {
  SpellTemplateRule,
  SpellTemplateToolSettings as SpellTemplateToolSettingsType,
  SpellTemplateToolType,
} from "../../types/SpellTemplate";

type SpellTemplateToolSettingsProps = {
  settings: SpellTemplateToolSettingsType;
  onSettingChange: (change: Partial<SpellTemplateToolSettingsType>) => void;
  selectedTemplateId?: string | null;
  onRemoveSelectedTemplate?: (() => void) | null;
  hasTemplates?: boolean;
  onRemoveAllTemplates?: (() => void) | null;
};

type RuleOption = { value: SpellTemplateRule; label: string };

type ColorCircleProps = {
  color: string;
  selected: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
} & SxProp;
function ColorCircle({ color, selected, onClick, sx }: ColorCircleProps) {
  const { t } = useI18n();
  return (
    <Box
      sx={{
        borderRadius: "50%",
        transform: "scale(0.75)",
        backgroundColor: color,
        cursor: "pointer",
        position: "relative",
        ...sx,
      }}
      onClick={onClick}
      aria-label={t("tools.color.templateColor", { color })}
    >
      {selected && (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            border: "2px solid white",
            position: "absolute",
            top: 0,
            borderRadius: "50%",
          }}
        />
      )}
    </Box>
  );
}

type ColorControlProps = {
  color: string;
  onColorChange: (newColor: string) => void;
};

function SpellTemplateColorControl({
  color,
  onColorChange,
}: ColorControlProps) {
  const { t } = useI18n();
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [colorMenuOptions, setColorMenuOptions] = useState({});

  const palette = colorOptions.filter((c) => c !== "primary");
  const paletteColor = colors[color as Color];
  const displayColor = paletteColor || color;

  function handleControlClick(event: MouseEvent<HTMLDivElement>) {
    if (showColorMenu) {
      setShowColorMenu(false);
      setColorMenuOptions({});
    } else {
      setShowColorMenu(true);
      const rect = event.currentTarget.getBoundingClientRect();
      setColorMenuOptions({
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.bottom + 16}px`,
        style: { transform: "translateX(-50%)" },
        excludeNode: event.currentTarget,
      });
    }
  }

  const colorMenu = (
    <MapMenu
      isOpen={showColorMenu}
      onRequestClose={() => {
        setShowColorMenu(false);
        setColorMenuOptions({});
      }}
      {...colorMenuOptions}
    >
      <Box
        sx={{
          width: "120px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
        p={1}
      >
        {palette.map((c) => (
          <ColorCircle
            key={c}
            color={colors[c]}
            selected={c === color}
            onClick={() => {
              onColorChange(c);
              setShowColorMenu(false);
              setColorMenuOptions({});
            }}
            sx={{ width: "25%", paddingTop: "25%" }}
          />
        ))}
      </Box>
      <Box px={2} pb={2}>
        <Label htmlFor="spell-template-color">
          {t("tools.color.custom")}
        </Label>
        <Input
          id="spell-template-color"
          type="color"
          value={displayColor.startsWith("#") ? displayColor : "#ff4d4d"}
          onChange={(event) => onColorChange(event.target.value)}
        />
      </Box>
    </MapMenu>
  );

  return (
    <>
      <ColorCircle
        color={displayColor}
        selected
        onClick={handleControlClick}
        sx={{ width: "32px", height: "32px", transform: "scale(1)" }}
      />
      {colorMenu}
    </>
  );
}
function SpellTemplateToolSettings({
  settings,
  onSettingChange,
  selectedTemplateId,
  onRemoveSelectedTemplate,
  hasTemplates,
  onRemoveAllTemplates,
}: SpellTemplateToolSettingsProps) {
  const { t } = useI18n();
  const isSmallScreen = useMedia({ query: "(max-width: 799px)" });
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsMenuOptions, setSettingsMenuOptions] = useState({});
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const clearAllButtonRef = useRef<HTMLButtonElement | null>(null);
  const [clearAllMenuPosition, setClearAllMenuPosition] = useState({
    left: 0,
    top: 0,
  });

  const toolIconSx = {
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      width: "28px",
      height: "28px",
    },
  };

  const ruleOptions: RuleOption[] = [
    { value: "center", label: t("tools.spellTemplateTool.ruleCenter") },
    { value: "area_50", label: t("tools.spellTemplateTool.ruleArea50") },
    { value: "touch", label: t("tools.spellTemplateTool.ruleTouch") },
    { value: "ruleset_dnd5e", label: t("tools.spellTemplateTool.ruleDnd5e") },
    { value: "ruleset_pf", label: t("tools.spellTemplateTool.rulePathfinder") },
  ];

  const tools = [
    {
      id: "drag",
      title: t("tools.spellTemplateTool.move"),
      isSelected: settings.type === "drag",
      icon: (
        <Box sx={toolIconSx}>
          <SpellTemplateDragToolIcon />
        </Box>
      ),
    },
    {
      id: "circle",
      title: t("tools.spellTemplateTool.circle"),
      isSelected: settings.type === "circle",
      icon: (
        <Box sx={toolIconSx}>
          <BrushCircleIcon />
        </Box>
      ),
    },
    {
      id: "rectangle",
      title: t("tools.spellTemplateTool.rectangle"),
      isSelected: settings.type === "rectangle",
      icon: (
        <Box sx={toolIconSx}>
          <BrushRectangleIcon />
        </Box>
      ),
    },
    {
      id: "cone",
      title: t("tools.spellTemplateTool.cone"),
      isSelected: settings.type === "cone",
      icon: (
        <Box sx={toolIconSx}>
          <BrushTriangleIcon />
        </Box>
      ),
    },
    {
      id: "line",
      title: t("tools.spellTemplateTool.line"),
      isSelected: settings.type === "line",
      icon: (
        <Box sx={toolIconSx}>
          <BrushLineIcon />
        </Box>
      ),
    },
    {
      id: "ring",
      title: t("tools.spellTemplateTool.ring"),
      isSelected: settings.type === "ring",
      icon: (
        <Box sx={toolIconSx}>
          <BrushCircleIcon />
        </Box>
      ),
    },
    {
      id: "path",
      title: t("tools.wall"),
      isSelected: settings.type === "path",
      icon: (
        <Box sx={toolIconSx}>
          <BrushLineIcon />
        </Box>
      ),
    },
  ];

  const selectedRule = ruleOptions.find((rule) => rule.value === settings.rule);

  useEffect(() => {
    if (!isClearAllConfirmOpen) {
      return;
    }
    const button = clearAllButtonRef.current;
    if (!button) {
      return;
    }
    const rect = button.getBoundingClientRect();
    setClearAllMenuPosition({
      left: rect.left + rect.width / 2,
      top: rect.bottom + 8,
    });
  }, [isClearAllConfirmOpen]);

  function handleSettingsClick(event: MouseEvent<HTMLButtonElement>) {
    if (showSettingsMenu) {
      setShowSettingsMenu(false);
      setSettingsMenuOptions({});
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setShowSettingsMenu(true);
    setSettingsMenuOptions({
      left: `${rect.left + rect.width / 2}px`,
      top: `${rect.bottom + 16}px`,
      style: { transform: "translateX(-50%)" },
      excludeNode: event.currentTarget,
    });
  }

  const settingsMenu = (
    <MapMenu
      isOpen={showSettingsMenu}
      onRequestClose={() => {
        setShowSettingsMenu(false);
        setSettingsMenuOptions({});
      }}
      {...settingsMenuOptions}
    >
      <Box
        sx={{
          width: "320px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
        p={2}
      >
        <Box>
          <Label>{t("tools.spellTemplateTool.rule")}</Label>
          <Select
            value={selectedRule || null}
            options={ruleOptions}
            onChange={(option: any) =>
              onSettingChange({ rule: option?.value || "center" })
            }
          />
        </Box>
        <Divider />
        <Flex sx={{ gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ minWidth: "140px", flex: "1 1 140px" }}>
            <Label htmlFor="spell-template-line-width">
              {t("tools.spellTemplateTool.widthCells")}
            </Label>
            <Input
              id="spell-template-line-width"
              type="number"
              min={0.25}
              step={0.25}
              value={settings.lineWidth}
              onChange={(event) =>
                onSettingChange({
                  lineWidth: Math.max(0, Number(event.target.value) || 0),
                })
              }
            />
          </Box>
          <Box sx={{ minWidth: "140px", flex: "1 1 140px" }}>
            <Label htmlFor="spell-template-cone-angle">
              {t("tools.spellTemplateTool.angleDeg")}
            </Label>
            <Input
              id="spell-template-cone-angle"
              type="number"
              min={10}
              max={180}
              step={5}
              value={settings.coneAngle}
              onChange={(event) =>
                onSettingChange({
                  coneAngle: Math.max(1, Number(event.target.value) || 0),
                })
              }
            />
          </Box>
          <Box sx={{ minWidth: "140px", flex: "1 1 140px" }}>
            <Label htmlFor="spell-template-ring-inner">
              {t("tools.spellTemplateTool.innerRatio")}
            </Label>
            <Input
              id="spell-template-ring-inner"
              type="number"
              min={0}
              max={0.9}
              step={0.05}
              value={settings.ringInnerRatio}
              onChange={(event) =>
                onSettingChange({
                  ringInnerRatio: Math.min(
                    0.95,
                    Math.max(0, Number(event.target.value) || 0)
                  ),
                })
              }
            />
          </Box>
        </Flex>
        <Divider />
        <Flex sx={{ gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ minWidth: "140px", flex: "1 1 140px" }}>
            <Label htmlFor="spell-template-opacity">
              {t("tools.spellTemplateTool.opacity")}
            </Label>
            <Input
              id="spell-template-opacity"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={settings.opacity}
              onChange={(event) =>
                onSettingChange({
                  opacity: Math.min(1, Math.max(0, Number(event.target.value))),
                })
              }
            />
          </Box>
          <Box sx={{ minWidth: "140px", flex: "1 1 140px" }}>
            <Label htmlFor="spell-template-stroke">
              {t("tools.spellTemplateTool.stroke")}
            </Label>
            <Input
              id="spell-template-stroke"
              type="number"
              min={0.1}
              step={0.1}
              value={settings.strokeWidth}
              onChange={(event) =>
                onSettingChange({
                  strokeWidth: Math.max(0, Number(event.target.value) || 0),
                })
              }
            />
          </Box>
        </Flex>
      </Box>
    </MapMenu>
  );

  return (
    <Flex
      sx={{
        alignItems: "center",
        flexWrap: isSmallScreen ? "wrap" : "nowrap",
        gap: 2,
      }}
    >
      <SpellTemplateColorControl
        color={settings.color}
        onColorChange={(color) => onSettingChange({ color })}
      />
      <Divider vertical />
      <ToolSection
        tools={tools}
        onToolClick={(tool) =>
          onSettingChange({ type: tool.id as SpellTemplateToolType })
        }
        collapse={isSmallScreen}
      />
      <Divider vertical />
      <IconButton
        aria-label={t("tools.spellTemplateTool.removeSelected")}
        title={t("tools.spellTemplateTool.removeSelected")}
        onClick={() => onRemoveSelectedTemplate && onRemoveSelectedTemplate()}
        disabled={!selectedTemplateId || !onRemoveSelectedTemplate}
      >
        <RemoveTokenIcon />
      </IconButton>
      <IconButton
        aria-label={t("tools.eraseAll")}
        title={t("tools.eraseAll")}
        onClick={() => {
          if (!hasTemplates || !onRemoveAllTemplates) {
            return;
          }
          setIsClearAllConfirmOpen(true);
        }}
        disabled={!hasTemplates || !onRemoveAllTemplates}
        ref={clearAllButtonRef}
      >
        <EraseAllIcon />
      </IconButton>
      <MapMenu
        isOpen={isClearAllConfirmOpen}
        onRequestClose={() => setIsClearAllConfirmOpen(false)}
        left={clearAllMenuPosition.left}
        top={clearAllMenuPosition.top}
        style={{ transform: "translateX(-50%)" }}
      >
        <Button
          disabled={!hasTemplates || !onRemoveAllTemplates}
          onClick={() => {
            setIsClearAllConfirmOpen(false);
            onRemoveAllTemplates && onRemoveAllTemplates();
          }}
        >
          {t("tools.eraseAll")}
        </Button>
      </MapMenu>
      <IconButton
        aria-label={
          settings.previewOnRotate
            ? t("tools.spellTemplateTool.disablePreview")
            : t("tools.spellTemplateTool.enablePreview")
        }
        title={
          settings.previewOnRotate
            ? t("tools.spellTemplateTool.disablePreview")
            : t("tools.spellTemplateTool.enablePreview")
        }
        onClick={() =>
          onSettingChange({ previewOnRotate: !settings.previewOnRotate })
        }
        sx={{ color: settings.previewOnRotate ? "primary" : "text" }}
      >
        {settings.previewOnRotate ? <FogPreviewOnIcon /> : <FogPreviewOffIcon />}
      </IconButton>
      <IconButton
        aria-label={t("tools.spellTemplateTool.settings")}
        title={t("tools.spellTemplateTool.settings")}
        onClick={handleSettingsClick}
        sx={{ color: showSettingsMenu ? "primary" : "text" }}
      >
        <SettingsIcon />
      </IconButton>
      {settingsMenu}
    </Flex>
  );
}

export default SpellTemplateToolSettings;
