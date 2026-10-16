import {
  TokenDisplayAnchor,
  TokenDisplayConfig,
  TokenDisplayKind,
  TokenDisplayKindDefaults,
  TokenDisplayStyle,
} from "../types/TokenState";
import {
  TokenDisplaySource,
  resolveDisplayStyle,
} from "./tokenDisplay";

/**
 * 状态展示的排版计算（纯函数，不依赖 Konva）。
 *
 * 坐标系与 `Token.tsx` 里的展示层一致：原点在指示物外框的左上角，
 * `x ∈ [0, width]`、`y ∈ [0, height]`，允许画到框外（比如底部的状态条）。
 */

export type DisplayLayoutItem = {
  key: string;
  kind: TokenDisplayKind;
  style: TokenDisplayStyle;
  anchor: Exclude<TokenDisplayAnchor, "auto">;
  color: string;
  text: string;
  label: string;
  ratio: number;
  interactive: boolean;
  opacity: number;
  /** 元素中心点坐标（token 局部坐标系） */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 圆形元素的半径（badge / ring） */
  radius: number;
  /** 椭圆元素的两个半径（ring 用，非正方形指示物会跟着拉伸） */
  radiusX?: number;
  radiusY?: number;
  fontSize: number;
  strokeWidth: number;
  cornerRadius: number;
  /** 颜色标记在环上的层叠序号，用于环内缩进 */
  ringIndex: number;
};

export type DisplayLayoutOptions = {
  sources: TokenDisplaySource[];
  config?: TokenDisplayConfig;
  globalDefaults?: TokenDisplayKindDefaults;
  width: number;
  height: number;
  hovered: boolean;
  selected: boolean;
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function estimateTextWidth(text: string, fontSize: number) {
  return Math.max(1, text.length) * fontSize * 0.62;
}

export function computeDisplayLayout({
  sources,
  config,
  globalDefaults,
  width,
  height,
  hovered,
  selected,
}: DisplayLayoutOptions): DisplayLayoutItem[] {
  const base = Math.min(width, height);
  const gap = clamp(base * 0.03, 1, 8);
  const padding = clamp(base * 0.04, 2, 12);

  const plans = sources
    .map((source, index) => ({
      source,
      index,
      style: resolveDisplayStyle(config, globalDefaults, source.kind, source.key),
    }))
    .filter((plan) => plan.style.visible)
    .filter((plan) => {
      if (plan.style.trigger === "hover") {
        return hovered || selected;
      }
      if (plan.style.trigger === "selected") {
        return selected;
      }
      return true;
    })
    .sort((a, b) => a.style.order - b.style.order || a.index - b.index);

  const items: DisplayLayoutItem[] = [];
  const anchorCounters: Record<string, number> = {};
  let statusRingIndex = 0;
  let progressRingIndex = 0;

  const centerX = width / 2;
  const centerY = height / 2;
  const badgeRadiusForRing = clamp(base / 9, 5, 28);
  const outerRingRadiusX = width / 2 + badgeRadiusForRing * 1.15;
  const outerRingRadiusY = height / 2 + badgeRadiusForRing * 1.15;

  const badgeRingCount = Math.max(
    1,
    plans.filter(
      (plan) =>
        plan.style.anchor === "ring" &&
        (plan.style.style === "badge" || plan.source.kind === "value")
    ).length
  );
  let badgeRingCursor = 0;

  for (const plan of plans) {
    const { source, style } = plan;
    const anchor = style.anchor;
    const counter = anchorCounters[anchor] ?? 0;
    anchorCounters[anchor] = counter + 1;

    if (style.style === "ring") {
      const isProgress = source.kind === "bar";
      const ringStroke = clamp(
        base * (isProgress ? 0.07 : 0.05) * style.scale,
        2,
        14
      );
      const index = isProgress ? progressRingIndex++ : statusRingIndex++;
      const inset =
        index * (ringStroke + clamp(base * 0.01, 1, 4)) + ringStroke / 2;
      const radiusX = Math.max(2, (width / 2) * 0.96 - inset);
      const radiusY = Math.max(2, (height / 2) * 0.96 - inset);
      items.push({
        key: source.key,
        kind: source.kind,
        style: "ring",
        anchor: "ring",
        color: source.color,
        text: source.text,
        label: source.label,
        ratio: source.ratio,
        interactive: false,
        opacity: style.opacity,
        x: centerX,
        y: centerY,
        width: radiusX * 2,
        height: radiusY * 2,
        radius: Math.min(radiusX, radiusY),
        radiusX,
        radiusY,
        fontSize: 0,
        strokeWidth: ringStroke,
        cornerRadius: 0,
        ringIndex: index,
      });
      continue;
    }

    if (style.style === "badge") {
      const radius = clamp((base / 9) * style.scale, 5, 30);
      const fontSize = clamp(radius * 0.95, 7, 26);
      let x = centerX;
      let y = centerY;
      if (anchor === "ring") {
        const step = (Math.PI * 2) / badgeRingCount;
        const angle = -Math.PI / 2 + badgeRingCursor * step;
        x = centerX + Math.cos(angle) * outerRingRadiusX;
        y = centerY + Math.sin(angle) * outerRingRadiusY;
        badgeRingCursor++;
      } else {
        const position = anchorPosition(
          anchor,
          counter,
          { width: radius * 2, height: radius * 2 },
          { width, height, gap, padding }
        );
        x = position.x + radius;
        y = position.y + radius;
      }
      items.push({
        key: source.key,
        kind: source.kind,
        style: "badge",
        anchor,
        color: source.color,
        text: source.text,
        label: source.label,
        ratio: source.ratio,
        interactive: source.interactive,
        opacity: style.opacity,
        x,
        y,
        width: radius * 2,
        height: radius * 2,
        radius,
        fontSize,
        strokeWidth: clamp(radius * 0.16, 1, 4),
        cornerRadius: 0,
        ringIndex: 0,
      });
      continue;
    }

    if (style.style === "bar") {
      const barHeight = clamp(base * 0.13 * style.scale, 5, 40);
      const barWidth = clamp(width * 0.9 * style.scale, 24, width * 1.1);
      const fontSize = clamp(barHeight * 0.92, 7, 24);
      const position = anchorPosition(
        anchor === "ring" ? "bottom" : anchor,
        counter,
        { width: barWidth, height: barHeight },
        { width, height, gap, padding }
      );
      items.push({
        key: source.key,
        kind: source.kind,
        style: "bar",
        anchor: anchor === "ring" ? "bottom" : anchor,
        color: source.color,
        text: source.text,
        label: source.label,
        ratio: source.ratio,
        interactive: source.interactive,
        opacity: style.opacity,
        x: position.x + barWidth / 2,
        y: position.y + barHeight / 2,
        width: barWidth,
        height: barHeight,
        radius: barHeight / 2,
        fontSize,
        strokeWidth: 0,
        cornerRadius: barHeight / 2,
        ringIndex: 0,
      });
      continue;
    }

    // chip / text
    const fontSize = clamp(base * 0.13 * style.scale, 7, 22);
    const text =
      style.style === "text"
        ? source.text
        : source.label
        ? `${source.label} ${source.text}`.trim()
        : source.text;
    const boxHeight =
      style.style === "chip" ? fontSize * 1.7 : fontSize * 1.35;
    const boxWidth =
      style.style === "chip"
        ? clamp(estimateTextWidth(text, fontSize) + fontSize * 1.2, fontSize * 1.6, width * 1.4)
        : estimateTextWidth(text, fontSize);
    const position = anchorPosition(
      anchor === "ring" ? "bottom" : anchor,
      counter,
      { width: boxWidth, height: boxHeight },
      { width, height, gap, padding }
    );
    items.push({
      key: source.key,
      kind: source.kind,
      style: style.style,
      anchor: anchor === "ring" ? "bottom" : anchor,
      color: source.color,
      text,
      label: source.label,
      ratio: source.ratio,
      interactive: source.interactive,
      opacity: style.opacity,
      x: position.x + boxWidth / 2,
      y: position.y + boxHeight / 2,
      width: boxWidth,
      height: boxHeight,
      radius: boxHeight / 2,
      fontSize,
      strokeWidth: 0,
      cornerRadius: style.style === "chip" ? boxHeight / 2 : 0,
      ringIndex: 0,
    });
  }

  return items;
}

/**
 * 按锚点把一个元素放到指示物边上。
 * 返回元素外框的左上角坐标。`index` 是同一锚点上的第几个元素。
 *
 * `top` / `bottom` / `left` / `right` 都贴指示物**内侧**边缘，避免和外面的
 * 环绕徽章、其它指示物互相压住；`inside` 是正中间。
 */
export function anchorPosition(
  anchor: Exclude<TokenDisplayAnchor, "auto" | "ring">,
  index: number,
  size: { width: number; height: number },
  box: { width: number; height: number; gap: number; padding: number }
): { x: number; y: number } {
  const { width, height, gap, padding } = box;
  const step = (axis: "x" | "y") =>
    (axis === "x" ? size.width : size.height) + gap;

  switch (anchor) {
    case "top":
      return {
        x: (width - size.width) / 2,
        y: padding + index * step("y"),
      };
    case "bottom":
      return {
        x: (width - size.width) / 2,
        y: height - padding - size.height - index * step("y"),
      };
    case "left":
      return {
        x: padding,
        y: (height - size.height) / 2 + index * step("y"),
      };
    case "right":
      return {
        x: width - padding - size.width,
        y: (height - size.height) / 2 + index * step("y"),
      };
    case "inside":
    default:
      return {
        x: (width - size.width) / 2,
        y: (height - size.height) / 2 + index * step("y"),
      };
  }
}
