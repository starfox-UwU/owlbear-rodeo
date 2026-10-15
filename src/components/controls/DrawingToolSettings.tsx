import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { Box, Flex, IconButton, Label } from "theme-ui";
import { useMedia } from "react-media";

import RadioIconButton from "../RadioIconButton";
import Slider from "../Slider";

import ColorControl from "./shared/ColorControl";
import AlphaBlendToggle from "./shared/AlphaBlendToggle";
import ToolSection from "./shared/ToolSection";
import ShapeFillToggle from "./shared/ShapeFillToggle";
import MapMenu from "../map/MapMenu";

import BrushIcon from "../../icons/BrushToolIcon";
import BrushPaintIcon from "../../icons/BrushPaintIcon";
import BrushLineIcon from "../../icons/BrushLineIcon";
import BrushRectangleIcon from "../../icons/BrushRectangleIcon";
import BrushCircleIcon from "../../icons/BrushCircleIcon";
import BrushTriangleIcon from "../../icons/BrushTriangleIcon";
import EraseIcon from "../../icons/EraseToolIcon";
import SettingsIcon from "../../icons/SettingsIcon";
import PenToolIcon from "../../icons/PenToolIcon";
import MoveToolIcon from "../../icons/MoveToolIcon";

import Divider from "../Divider";

import { useKeyboard } from "../../contexts/KeyboardContext";

import shortcuts from "../../shortcuts";

import { useI18n } from "../../i18n";

import {
  DrawingToolSettings as DrawingToolSettingsType,
  DrawingToolType,
  DashStyle,
} from "../../types/Drawing";
import EraseAllButton from "./shared/EraseAllButton";

type DrawingToolSettingsProps = {
  settings: DrawingToolSettingsType;
  onSettingChange: (change: Partial<DrawingToolSettingsType>) => void;
  onToolAction: (action: string) => void;
  disabledActions: string[];
};

function DrawingToolSettings({
  settings,
  onSettingChange,
  onToolAction,
  disabledActions,
}: DrawingToolSettingsProps) {
  const { t } = useI18n();

  // Keyboard shotcuts
  function handleKeyDown(event: KeyboardEvent) {
    if (shortcuts.drawBrush(event)) {
      onSettingChange({ type: "brush" });
    } else if (shortcuts.drawPaint(event)) {
      onSettingChange({ type: "paint" });
    } else if (shortcuts.drawLine(event)) {
      onSettingChange({ type: "line" });
    } else if (shortcuts.drawRect(event)) {
      onSettingChange({ type: "rectangle" });
    } else if (shortcuts.drawCircle(event)) {
      onSettingChange({ type: "circle" });
    } else if (shortcuts.drawTriangle(event)) {
      onSettingChange({ type: "triangle" });
    } else if (shortcuts.drawPen(event)) {
      onSettingChange({ type: "pen" });
    } else if (shortcuts.drawErase(event)) {
      onSettingChange({ type: "erase" });
    } else if (shortcuts.drawBlend(event)) {
      const nextBlending = !settings.useBlending;
      onSettingChange({
        useBlending: nextBlending,
        opacity: nextBlending ? 0.5 : 1,
      });
    } else if (shortcuts.drawFill(event)) {
      onSettingChange({ useShapeFill: !settings.useShapeFill });
    }
  }
  useKeyboard(handleKeyDown);

  // Change to brush if on erase and it gets disabled
  useEffect(() => {
    if (settings.type === "erase" && disabledActions.includes("erase")) {
      onSettingChange({ type: "brush" });
    }
  }, [disabledActions, settings, onSettingChange]);

  const isSmallScreen = useMedia({ query: "(max-width: 799px)" });

  const opacity =
    typeof settings.opacity === "number"
      ? settings.opacity
      : settings.useBlending
      ? 0.5
      : 1;
  const strokeWidth =
    typeof settings.strokeWidth === "number" ? settings.strokeWidth : 1;
  const dashStyle = settings.dashStyle || "solid";
  const supportsDash =
    settings.type === "line" ||
    settings.type === "rectangle" ||
    settings.type === "circle" ||
    settings.type === "triangle" ||
    settings.type === "pen";
  const dashInactive =
    !supportsDash ||
    (settings.useShapeFill &&
      settings.type !== "line" &&
      settings.type !== "pen");

  const tools = [
    {
      id: "brush",
      title: t("tools.drawingTool.brush"),
      isSelected: settings.type === "brush",
      icon: <BrushIcon />,
    },
    {
      id: "paint",
      title: t("tools.drawingTool.paint"),
      isSelected: settings.type === "paint",
      icon: <BrushPaintIcon />,
    },
    {
      id: "line",
      title: t("tools.drawingTool.line"),
      isSelected: settings.type === "line",
      icon: <BrushLineIcon />,
    },
    {
      id: "rectangle",
      title: t("tools.drawingTool.rectangle"),
      isSelected: settings.type === "rectangle",
      icon: <BrushRectangleIcon />,
    },
    {
      id: "circle",
      title: t("tools.drawingTool.circle"),
      isSelected: settings.type === "circle",
      icon: <BrushCircleIcon />,
    },
    {
      id: "triangle",
      title: t("tools.drawingTool.triangle"),
      isSelected: settings.type === "triangle",
      icon: <BrushTriangleIcon />,
    },
    {
      id: "pen",
      title: t("tools.drawingTool.pen"),
      isSelected: settings.type === "pen",
      icon: <PenToolIcon />,
    },
    {
      id: "drag",
      title: t("tools.drawingTool.drag"),
      isSelected: settings.type === "drag",
      icon: <MoveToolIcon />,
    },
  ];

  function handleAdvancedClick(event: MouseEvent<HTMLButtonElement>) {
    if (showAdvancedMenu) {
      setShowAdvancedMenu(false);
      setAdvancedMenuOptions({});
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setShowAdvancedMenu(true);
    setAdvancedMenuOptions({
      left: `${rect.left + rect.width / 2}px`,
      top: `${rect.bottom + 16}px`,
      style: { transform: "translateX(-50%)" },
      excludeNode: event.currentTarget,
    });
  }

  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);
  const [advancedMenuOptions, setAdvancedMenuOptions] = useState({});

  const dashOptions: { id: DashStyle; title: string; dash: number[] }[] = [
    { id: "solid", title: t("tools.drawingTool.solid"), dash: [] },
    { id: "dashed", title: t("tools.drawingTool.dashed"), dash: [6, 4] },
    { id: "dotted", title: t("tools.drawingTool.dotted"), dash: [2, 3] },
  ];

  const advancedMenu = (
    <MapMenu
      isOpen={showAdvancedMenu}
      onRequestClose={() => {
        setShowAdvancedMenu(false);
        setAdvancedMenuOptions({});
      }}
      {...advancedMenuOptions}
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
          <Label>{t("tools.drawingTool.opacity")}</Label>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            labelFunc={(value) => `${Math.round(value * 100)}%`}
            onChange={(event) => {
              const next = Number(event.target.value);
              onSettingChange({
                opacity: next,
                useBlending: next < 1,
              });
            }}
          />
        </Box>
        <Divider />
        <Box>
          <Label>{t("tools.drawingTool.stroke")}</Label>
          <Slider
            min={0.25}
            max={4}
            step={0.25}
            value={strokeWidth}
            labelFunc={(value) => `${value}x`}
            onChange={(event) =>
              onSettingChange({ strokeWidth: Number(event.target.value) })
            }
          />
        </Box>
        <Divider />
        <Box>
          <Label>
            {t("tools.drawingTool.dash")} {dashStyle ? `(${dashStyle})` : ""}
            {dashInactive ? ` ${t("tools.drawingTool.lineShapeOnly")}` : ""}
          </Label>
          <Flex sx={{ gap: 1, flexWrap: "wrap" }}>
            {dashOptions.map((option) => (
              <RadioIconButton
                key={option.id}
                title={option.title}
                isSelected={dashStyle === option.id}
                onClick={() => onSettingChange({ dashStyle: option.id })}
                sx={{
                  backgroundColor:
                    dashStyle === option.id ? "highlight" : "transparent",
                  borderRadius: "4px",
                }}
              >
                <Box
                  sx={{
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentcolor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line
                      x1="4"
                      y1="12"
                      x2="20"
                      y2="12"
                      strokeDasharray={option.dash.join(" ")}
                    />
                  </svg>
                </Box>
              </RadioIconButton>
            ))}
          </Flex>
        </Box>
      </Box>
    </MapMenu>
  );

  return (
    <Flex sx={{ alignItems: "center" }}>
      <ColorControl
        color={settings.color}
        onColorChange={(color) => onSettingChange({ color })}
        exclude={["primary"]}
        allowCustom
      />
      <Divider vertical />
      <ToolSection
        tools={tools}
        onToolClick={(tool) =>
          onSettingChange({ type: tool.id as DrawingToolType })
        }
        collapse={isSmallScreen}
      />
      <Divider vertical />
      <RadioIconButton
        title={t("tools.drawingTool.erase")}
        onClick={() => onSettingChange({ type: "erase" })}
        isSelected={settings.type === "erase"}
        disabled={disabledActions.includes("erase")}
      >
        <EraseIcon />
      </RadioIconButton>
      <EraseAllButton
        onToolAction={onToolAction}
        disabled={disabledActions.includes("erase")}
      />
      <Divider vertical />
      <AlphaBlendToggle
        useBlending={settings.useBlending}
        onBlendingChange={(useBlending) =>
          onSettingChange({ useBlending, opacity: useBlending ? 0.5 : 1 })
        }
      />
      <ShapeFillToggle
        useShapeFill={settings.useShapeFill}
        onShapeFillChange={(useShapeFill) => onSettingChange({ useShapeFill })}
      />
      <IconButton
        aria-label={t("tools.drawingTool.advancedSettings")}
        title={t("tools.drawingTool.advancedSettings")}
        onClick={handleAdvancedClick}
        sx={{ color: showAdvancedMenu ? "primary" : "text" }}
      >
        <SettingsIcon />
      </IconButton>
      {advancedMenu}
    </Flex>
  );
}

export default DrawingToolSettings;
