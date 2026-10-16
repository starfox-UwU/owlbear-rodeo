import { useMemo } from "react";
import Konva from "konva";
import { Circle, Ellipse, Group, Rect, Text } from "react-konva";

import {
  computeDisplayLayout,
  DisplayPanelRow,
} from "../../helpers/tokenDisplayLayout";
import { collectDisplaySources } from "../../helpers/tokenDisplay";
import {
  TokenDisplayConfig,
  TokenDisplayKindDefaults,
  TokenState,
} from "../../types/TokenState";

type TokenStatusDisplayProps = {
  tokenState: TokenState;
  width: number;
  height: number;
  isMapOwner: boolean;
  isTokenOwner: boolean;
  hovered: boolean;
  selected: boolean;
  /** 全局默认展示规则，作为最低优先级的用户配置 */
  globalDefaults?: TokenDisplayKindDefaults;
  /** 点击可交互的条目（属性条 / 数值）时回调，key 形如 `bar:<id>` */
  onItemClick?: (key: string, node: Konva.Node) => void;
};

const TRACK_COLOR = "rgba(10, 10, 14, 0.62)";
const TRACK_STROKE = "rgba(255, 255, 255, 0.16)";
const PANEL_FILL = "rgba(16, 16, 21, 0.92)";
const PANEL_STROKE = "rgba(255, 255, 255, 0.14)";
const TEXT_SHADOW = {
  shadowColor: "rgba(0, 0, 0, 0.85)",
  shadowBlur: 3,
  shadowOffsetX: 0,
  shadowOffsetY: 1,
  shadowOpacity: 0.8,
};

/** 把 `rgb(r, g, b)` 调亮/调暗，用来做渐变，避免平面色显得死板 */
function shade(color: string, amount: number) {
  const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(color);
  if (!match) {
    return color;
  }
  const channel = (value: string) => {
    const base = Number(value);
    const next = amount >= 0 ? base + (255 - base) * amount : base * (1 + amount);
    return Math.round(Math.min(255, Math.max(0, next)));
  };
  return `rgb(${channel(match[1])}, ${channel(match[2])}, ${channel(match[3])})`;
}

/**
 * 指示物状态展示层。
 *
 * 贴在指示物上的元素和悬停状态栏都由 `helpers/tokenDisplayLayout.ts` 算好坐标，
 * 本组件只负责把它们画得好看一点。
 */
function TokenStatusDisplay({
  tokenState,
  width,
  height,
  isMapOwner,
  isTokenOwner,
  hovered,
  selected,
  globalDefaults,
  onItemClick,
}: TokenStatusDisplayProps) {
  const config: TokenDisplayConfig | undefined = tokenState.display;

  const layout = useMemo(() => {
    const sources = collectDisplaySources(tokenState, {
      isMapOwner,
      isTokenOwner,
    });
    return computeDisplayLayout({
      sources,
      config,
      globalDefaults,
      width,
      height,
      hovered,
      selected,
      // 指示物在地图右半边时状态栏朝左弹，避免顶到地图外
      panelSide: tokenState.x > 0.5 ? "left" : "right",
    });
  }, [
    tokenState,
    config,
    globalDefaults,
    width,
    height,
    hovered,
    selected,
    isMapOwner,
    isTokenOwner,
  ]);

  const { items, panel } = layout;

  if (items.length === 0 && !panel) {
    return null;
  }

  function handleClick(
    event: Konva.KonvaEventObject<Event>,
    key: string,
    interactive: boolean
  ) {
    if (!onItemClick || !interactive) {
      return;
    }
    event.cancelBubble = true;
    onItemClick(key, event.currentTarget);
  }

  return (
    <Group x={0} y={0}>
      {items.map((item) => {
        const listening = item.interactive && !!onItemClick;
        const groupProps = {
          key: item.key,
          x: item.x,
          y: item.y,
          opacity: item.opacity,
          listening,
          onClick: (event: Konva.KonvaEventObject<Event>) =>
            handleClick(event, item.key, item.interactive),
          onTap: (event: Konva.KonvaEventObject<Event>) =>
            handleClick(event, item.key, item.interactive),
        };

        if (item.style === "ring") {
          const radiusX = item.radiusX ?? item.radius;
          const radiusY = item.radiusY ?? item.radius;
          // Ramanujan 近似，给进度环算周长
          const perimeter =
            Math.PI *
            (3 * (radiusX + radiusY) -
              Math.sqrt((3 * radiusX + radiusY) * (radiusX + 3 * radiusY)));
          const progress = Math.max(0, Math.min(1, item.ratio));
          return (
            <Group
              key={item.key}
              x={item.x}
              y={item.y}
              opacity={item.opacity}
              listening={false}
            >
              <Ellipse
                radiusX={radiusX}
                radiusY={radiusY}
                stroke={item.kind === "bar" ? TRACK_COLOR : item.color}
                strokeWidth={item.strokeWidth}
                fillEnabled={false}
                listening={false}
              />
              {item.kind === "bar" ? (
                <Ellipse
                  radiusX={radiusX}
                  radiusY={radiusY}
                  stroke={item.color}
                  strokeWidth={item.strokeWidth}
                  fillEnabled={false}
                  rotation={-90}
                  strokeDasharray={[
                    Math.max(0.001, perimeter * progress),
                    perimeter,
                  ]}
                  lineCap="round"
                  listening={false}
                />
              ) : null}
            </Group>
          );
        }

        if (item.style === "badge") {
          return (
            <Group {...groupProps}>
              <Circle
                radius={item.radius}
                fill={item.color}
                stroke="rgba(255, 255, 255, 0.9)"
                strokeWidth={item.strokeWidth}
                shadowColor="rgba(0, 0, 0, 0.5)"
                shadowBlur={3}
                shadowOffsetX={0}
                shadowOffsetY={1}
                shadowOpacity={0.5}
              />
              {item.text ? (
                <Text
                  text={item.text}
                  width={item.radius * 2}
                  height={item.radius * 2}
                  offsetX={item.radius}
                  offsetY={item.radius}
                  align="center"
                  verticalAlign="middle"
                  fontSize={item.fontSize}
                  fontStyle="bold"
                  fill="white"
                  {...TEXT_SHADOW}
                />
              ) : null}
            </Group>
          );
        }

        if (item.style === "bar") {
          const halfWidth = item.width / 2;
          const halfHeight = item.height / 2;
          const progress = Math.max(0, Math.min(1, item.ratio));
          const estimatedTextWidth =
            Math.max(1, item.text.length) * item.fontSize * 0.55;
          const textScale = Math.min(1, item.width / (estimatedTextWidth + 1));
          return (
            <Group {...groupProps}>
              <Rect
                x={-halfWidth}
                y={-halfHeight}
                width={item.width}
                height={item.height}
                fill={TRACK_COLOR}
                cornerRadius={item.cornerRadius}
                stroke={TRACK_STROKE}
                strokeWidth={1}
              />
              {progress > 0 ? (
                <Rect
                  x={-halfWidth}
                  y={-halfHeight}
                  width={Math.max(item.height, item.width * progress)}
                  height={item.height}
                  fillLinearGradientStartPoint={{ x: 0, y: -halfHeight }}
                  fillLinearGradientEndPoint={{ x: 0, y: halfHeight }}
                  fillLinearGradientColorStops={[
                    0,
                    shade(item.color, 0.22),
                    1,
                    shade(item.color, -0.12),
                  ]}
                  cornerRadius={item.cornerRadius}
                  listening={false}
                />
              ) : null}
              {item.text ? (
                <Text
                  text={item.text}
                  x={-halfWidth}
                  y={-halfHeight}
                  width={item.width}
                  height={item.height}
                  align="center"
                  verticalAlign="middle"
                  fontSize={Math.max(7, Math.round(item.fontSize * textScale))}
                  fontStyle="bold"
                  fill="white"
                  listening={false}
                  {...TEXT_SHADOW}
                />
              ) : null}
            </Group>
          );
        }

        if (item.style === "chip") {
          const halfWidth = item.width / 2;
          const halfHeight = item.height / 2;
          return (
            <Group {...groupProps}>
              <Rect
                x={-halfWidth}
                y={-halfHeight}
                width={item.width}
                height={item.height}
                fillLinearGradientStartPoint={{ x: 0, y: -halfHeight }}
                fillLinearGradientEndPoint={{ x: 0, y: halfHeight }}
                fillLinearGradientColorStops={[
                  0,
                  shade(item.color, 0.2),
                  1,
                  shade(item.color, -0.18),
                ]}
                cornerRadius={item.cornerRadius}
                stroke="rgba(255, 255, 255, 0.22)"
                strokeWidth={1}
              />
              {item.text ? (
                <Text
                  text={item.text}
                  x={-halfWidth}
                  y={-halfHeight}
                  width={item.width}
                  height={item.height}
                  align="center"
                  verticalAlign="middle"
                  fontSize={item.fontSize}
                  fontStyle="bold"
                  fill="white"
                  listening={false}
                  {...TEXT_SHADOW}
                />
              ) : null}
            </Group>
          );
        }

        // text
        return (
          <Group {...groupProps}>
            <Text
              text={item.text}
              x={-item.width / 2}
              y={-item.height / 2}
              width={item.width}
              height={item.height}
              align="center"
              verticalAlign="middle"
              fontSize={item.fontSize}
              fontStyle="bold"
              fill="white"
              {...TEXT_SHADOW}
            />
          </Group>
        );
      })}

      {panel ? (
        <Group listening={true}>
          <Rect
            x={panel.x}
            y={panel.y}
            width={panel.width}
            height={panel.height}
            fill={PANEL_FILL}
            cornerRadius={panel.cornerRadius}
            stroke={PANEL_STROKE}
            strokeWidth={1}
            shadowColor="rgba(0, 0, 0, 0.55)"
            shadowBlur={8}
            shadowOffsetX={0}
            shadowOffsetY={3}
            shadowOpacity={0.6}
          />
          {panel.rows.map((row) => (
            <PanelRow
              key={row.key}
              row={row}
              fontSize={panel.fontSize}
              onItemClick={onItemClick}
            />
          ))}
        </Group>
      ) : null}
    </Group>
  );
}

function PanelRow({
  row,
  fontSize,
  onItemClick,
}: {
  row: DisplayPanelRow;
  fontSize: number;
  onItemClick?: (key: string, node: Konva.Node) => void;
}) {
  const listening = row.interactive && !!onItemClick;
  const progress = Math.max(0, Math.min(1, row.ratio));
  const rowRadius = row.height / 2;

  function handleClick(event: Konva.KonvaEventObject<Event>) {
    if (!listening) {
      return;
    }
    event.cancelBubble = true;
    onItemClick?.(row.key, event.currentTarget);
  }

  return (
    <Group
      opacity={row.opacity}
      listening={listening}
      onClick={handleClick}
      onTap={handleClick}
    >
      {/* 属性条行用带颜色的进度底衬，一眼看出还剩多少 */}
      {row.kind === "bar" && progress > 0 ? (
        <Rect
          x={row.x}
          y={row.y}
          width={Math.max(row.height, row.width * progress)}
          height={row.height}
          fill={row.color}
          opacity={0.32}
          cornerRadius={rowRadius}
          listening={false}
        />
      ) : null}
      <Circle
        x={row.dotX}
        y={row.dotY}
        radius={row.dotRadius}
        fill={row.color}
        listening={false}
      />
      <Text
        text={row.label}
        x={row.textX}
        y={row.y}
        width={row.labelWidth}
        height={row.height}
        verticalAlign="middle"
        fontSize={fontSize}
        fill="rgba(255, 255, 255, 0.88)"
        ellipsis
        wrap="none"
        listening={false}
      />
      <Text
        text={row.text}
        x={row.valueX - row.valueWidth}
        y={row.y}
        width={row.valueWidth}
        height={row.height}
        align="right"
        verticalAlign="middle"
        fontSize={fontSize}
        fontStyle="bold"
        fill="white"
        listening={false}
      />
    </Group>
  );
}

export default TokenStatusDisplay;
