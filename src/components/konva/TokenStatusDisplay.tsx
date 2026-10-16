import { useMemo } from "react";
import Konva from "konva";
import { Circle, Ellipse, Group, Rect, Text } from "react-konva";

import {
  computeDisplayLayout,
  DisplayLayoutItem,
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
  onItemClick?: (item: DisplayLayoutItem, node: Konva.Node) => void;
};

const TRACK_COLOR = "rgba(10, 10, 12, 0.55)";
const TEXT_SHADOW = {
  shadowColor: "rgba(0, 0, 0, 0.9)",
  shadowBlur: 3,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowOpacity: 0.9,
};

/**
 * 指示物状态展示层。
 *
 * 颜色标记 / 属性条 / 属性值统一在这里按展示配置渲染，
 * 样式与位置由 `helpers/tokenDisplayLayout.ts` 计算，本组件只负责画。
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

  const items = useMemo(() => {
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

  if (items.length === 0) {
    return null;
  }

  function handleClick(
    event: Konva.KonvaEventObject<Event>,
    item: DisplayLayoutItem
  ) {
    if (!onItemClick || !item.interactive) {
      return;
    }
    event.cancelBubble = true;
    onItemClick(item, event.currentTarget);
  }

  return (
    <Group x={0} y={0}>
      {items.map((item) => {
        const listening = item.interactive && !!onItemClick;
        const commonGroupProps = {
          key: item.key,
          x: item.x,
          y: item.y,
          opacity: item.opacity,
          listening,
          onClick: (event: Konva.KonvaEventObject<Event>) =>
            handleClick(event, item),
          onTap: (event: Konva.KonvaEventObject<Event>) =>
            handleClick(event, item),
        };

        if (item.style === "ring") {
          const radiusX = item.radiusX ?? item.radius;
          const radiusY = item.radiusY ?? item.radius;
          const perimeter =
            Math.PI *
            (3 * (radiusX + radiusY) -
              Math.sqrt(
                (3 * radiusX + radiusY) * (radiusX + 3 * radiusY)
              ));
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
                  listening={false}
                />
              ) : null}
            </Group>
          );
        }

        if (item.style === "badge") {
          return (
            <Group {...commonGroupProps}>
              <Circle
                radius={item.radius}
                fill={item.color}
                stroke="rgba(0, 0, 0, 0.65)"
                strokeWidth={item.strokeWidth}
                shadowColor="rgba(0, 0, 0, 0.5)"
                shadowBlur={2}
                shadowOffsetX={0}
                shadowOffsetY={1}
                shadowOpacity={0.6}
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
                  listening={false}
                  {...TEXT_SHADOW}
                />
              ) : null}
            </Group>
          );
        }

        if (item.style === "bar") {
          const barWidth = item.width;
          const barHeight = item.height;
          const halfWidth = barWidth / 2;
          const halfHeight = barHeight / 2;
          const progress = Math.max(0, Math.min(1, item.ratio));
          const estimatedTextWidth = Math.max(1, item.text.length) * item.fontSize * 0.6;
          const textScale = Math.min(1, barWidth / (estimatedTextWidth + 1));
          return (
            <Group {...commonGroupProps}>
              <Rect
                x={-halfWidth}
                y={-halfHeight}
                width={barWidth}
                height={barHeight}
                fill={TRACK_COLOR}
                cornerRadius={item.cornerRadius}
              />
              <Rect
                x={-halfWidth}
                y={-halfHeight}
                width={Math.max(2, barWidth * progress)}
                height={barHeight}
                fill={item.color}
                cornerRadius={item.cornerRadius}
                listening={false}
              />
              {item.text ? (
                <Text
                  text={item.text}
                  x={-halfWidth}
                  y={-halfHeight}
                  width={barWidth}
                  height={barHeight}
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
            <Group {...commonGroupProps}>
              <Rect
                x={-halfWidth}
                y={-halfHeight}
                width={item.width}
                height={item.height}
                fill={item.color}
                cornerRadius={item.cornerRadius}
                stroke="rgba(0, 0, 0, 0.5)"
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
          <Group {...commonGroupProps}>
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
    </Group>
  );
}

export default TokenStatusDisplay;
