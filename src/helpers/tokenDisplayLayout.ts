import {
  TokenDisplayAnchor,
  TokenDisplayConfig,
  TokenDisplayKind,
  TokenDisplayKindDefaults,
  TokenDisplayStyle,
} from "../types/TokenState";
import { TokenDisplaySource, resolveDisplayStyle } from "./tokenDisplay";

/**
 * 状态展示的排版计算（纯函数，不依赖 Konva）。
 *
 * 坐标系与 `Token.tsx` 里的展示层一致：原点在指示物外框的左上角，
 * `x ∈ [0, width]`、`y ∈ [0, height]`。所有元素都画在框内，
 * 只有悬停状态栏会伸到框外。
 *
 * 输出分两部分：
 * - `items`：贴在指示物身上的元素（环 / 条 / 徽章 / 标签牌 / 文字）
 * - `panel`：悬停时弹出的状态栏，列不适合占用指示物画面的条目
 */

export type DisplayLayoutItem = {
  key: string;
  kind: TokenDisplayKind;
  style: TokenDisplayStyle;
  anchor: Exclude<TokenDisplayAnchor, "auto" | "panel">;
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

export type DisplayPanelRow = {
  key: string;
  kind: TokenDisplayKind;
  color: string;
  label: string;
  text: string;
  ratio: number;
  interactive: boolean;
  opacity: number;
  /** 行内元素坐标 */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 行内色点的圆心 */
  dotX: number;
  dotY: number;
  dotRadius: number;
  textX: number;
  valueX: number;
  /** 数值列宽度（右对齐），标签列宽度 = valueX - textX - 间隔 - valueWidth */
  valueWidth: number;
  labelWidth: number;
};

export type DisplayPanelLayout = {
  /** 状态栏在 token 局部坐标系里的位置（可以伸到框外） */
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
  padding: number;
  fontSize: number;
  /** 条形进度行用作底的填充比例 */
  rows: DisplayPanelRow[];
};

export type DisplayLayout = {
  items: DisplayLayoutItem[];
  panel: DisplayPanelLayout | null;
};

export type DisplayLayoutOptions = {
  sources: TokenDisplaySource[];
  config?: TokenDisplayConfig;
  globalDefaults?: TokenDisplayKindDefaults;
  width: number;
  height: number;
  hovered: boolean;
  selected: boolean;
  /** 状态栏朝向：指示物在地图右半边时自动朝左 */
  panelSide?: "left" | "right";
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function estimateTextWidth(text: string, fontSize: number) {
  return Math.max(1, text.length) * fontSize * 0.58;
}

export function computeDisplayLayout({
  sources,
  config,
  globalDefaults,
  width,
  height,
  hovered,
  selected,
  panelSide = "right",
}: DisplayLayoutOptions): DisplayLayout {
  const base = Math.min(width, height);
  const gap = clamp(base * 0.03, 1, 8);
  const padding = clamp(base * 0.06, 3, 14);

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
  const statusRingStroke = clamp(base * 0.05, 2, 14);
  const progressRingStroke = clamp(base * 0.07, 2, 16);

  // 环带占掉的边缘厚度，避免贴边的条压住环
  const hasStatusRing = plans.some(
    (plan) => plan.style.anchor === "ring" && plan.style.style === "ring" && plan.source.kind !== "bar"
  );
  const hasProgressRing = plans.some(
    (plan) => plan.style.anchor === "ring" && plan.style.style === "ring" && plan.source.kind === "bar"
  );
  const ringInset =
    (hasStatusRing ? statusRingStroke : 0) +
    (hasProgressRing ? progressRingStroke : 0) +
    (hasStatusRing || hasProgressRing ? 2 : 0);

  const innerBox = {
    x: ringInset,
    y: ringInset,
    width: Math.max(1, width - ringInset * 2),
    height: Math.max(1, height - ringInset * 2),
  };

  const badgeRadiusForRing = clamp(base / 10, 5, 26);
  const outerRingRadiusX = width / 2 + badgeRadiusForRing * 1.2;
  const outerRingRadiusY = height / 2 + badgeRadiusForRing * 1.2;
  const badgeRingCount = Math.max(
    1,
    plans.filter((plan) => plan.style.anchor === "ring").length
  );
  let badgeRingCursor = 0;

  const panelPlans: typeof plans = [];

  for (const plan of plans) {
    const { source, style } = plan;

    if (style.anchor === "panel") {
      panelPlans.push(plan);
      continue;
    }

    const anchor = style.anchor;
    const counter = anchorCounters[anchor] ?? 0;
    anchorCounters[anchor] = counter + 1;

    if (style.style === "ring") {
      const isProgress = source.kind === "bar";
      const ringStroke = isProgress
        ? clamp(progressRingStroke * style.scale, 2, 16)
        : clamp(statusRingStroke * style.scale, 2, 14);
      const index = isProgress ? progressRingIndex++ : statusRingIndex++;
      const inset =
        index * (ringStroke + clamp(base * 0.012, 1, 4)) + ringStroke / 2;
      // 环带压在指示物边缘上，视觉上像描边而不是缩了一圈
      const radiusX = Math.max(2, width / 2 - inset);
      const radiusY = Math.max(2, height / 2 - inset);
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
      const radius = clamp((base / 10) * style.scale, 5, 28);
      const fontSize = clamp(radius * 0.95, 7, 24);
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
          { box: innerBox, gap, padding }
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
        strokeWidth: clamp(radius * 0.13, 1, 4),
        cornerRadius: 0,
        ringIndex: 0,
      });
      continue;
    }

    if (style.style === "bar") {
      const barHeight = clamp(base * 0.11 * style.scale, 5, 34);
      const barWidth = clamp(innerBox.width * 0.84 * style.scale, 20, innerBox.width);
      const fontSize = clamp(barHeight * 0.92, 7, 22);
      const position = anchorPosition(
        anchor === "ring" ? "bottom" : anchor,
        counter,
        { width: barWidth, height: barHeight },
        { box: innerBox, gap, padding }
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
    const boxHeight = style.style === "chip" ? fontSize * 1.7 : fontSize * 1.35;
    const boxWidth =
      style.style === "chip"
        ? clamp(
            estimateTextWidth(text, fontSize) + fontSize * 1.3,
            fontSize * 1.6,
            innerBox.width
          )
        : estimateTextWidth(text, fontSize);
    const position = anchorPosition(
      anchor === "ring" ? "bottom" : anchor,
      counter,
      { width: boxWidth, height: boxHeight },
      { box: innerBox, gap, padding }
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

  const panel = computePanelLayout(panelPlans, {
    width,
    height,
    base,
    panelSide,
  });

  clampItemsToRings(items, centerX, centerY);

  return { items, panel };
}

/**
 * 贴在指示物上的条 / 标签如果比圆环在那一行的弦还宽，
 * 两头就会戳出环外。这里按最内圈环的椭圆弦长收一收宽度，
 * 并且**同一锚点上的元素取同一条弦**，一排条宽度一致才不会显得参差。
 */
function clampItemsToRings(
  items: DisplayLayoutItem[],
  centerX: number,
  centerY: number
) {
  const rings = items.filter((item) => item.style === "ring");
  if (rings.length === 0) {
    return;
  }
  let freeX = Infinity;
  let freeY = Infinity;
  for (const ring of rings) {
    freeX = Math.min(freeX, (ring.radiusX ?? ring.radius) - ring.strokeWidth / 2);
    freeY = Math.min(freeY, (ring.radiusY ?? ring.radius) - ring.strokeWidth / 2);
  }
  if (!Number.isFinite(freeX) || !Number.isFinite(freeY) || freeY <= 0) {
    return;
  }
  const margin = 4;
  const chordAt = (item: DisplayLayoutItem) => {
    const dy = Math.abs(item.y - centerY);
    if (dy >= freeY) {
      return 0;
    }
    return 2 * freeX * Math.sqrt(1 - (dy / freeY) ** 2) - margin * 2;
  };

  const limitPerAnchor = new Map<string, number>();
  for (const item of items) {
    if (item.style === "ring") {
      continue;
    }
    const chord = chordAt(item);
    if (chord <= 0) {
      continue;
    }
    const current = limitPerAnchor.get(item.anchor) ?? Infinity;
    limitPerAnchor.set(item.anchor, Math.min(current, chord));
  }

  for (const item of items) {
    if (item.style === "ring") {
      continue;
    }
    const limit = limitPerAnchor.get(item.anchor);
    if (limit === undefined || limit <= 0 || item.width <= limit) {
      continue;
    }
    item.width = limit;
    item.x = centerX;
  }
}

function computePanelLayout(
  plans: Array<{
    source: TokenDisplaySource;
    style: ReturnType<typeof resolveDisplayStyle>;
  }>,
  box: {
    width: number;
    height: number;
    base: number;
    panelSide: "left" | "right";
  }
): DisplayPanelLayout | null {
  if (plans.length === 0) {
    return null;
  }

  const { width, height, base, panelSide } = box;
  const fontSize = clamp(base * 0.13, 8, 22);
  const padding = fontSize * 0.7;
  const rowHeight = fontSize * 1.75;
  const rowGap = fontSize * 0.25;
  const dotRadius = fontSize * 0.32;
  const labelWidth = Math.max(
    ...plans.map((plan) =>
      estimateTextWidth(panelLabel(plan.source), fontSize)
    )
  );
  const valueWidth = Math.max(
    ...plans.map((plan) => estimateTextWidth(plan.source.text, fontSize))
  );
  const contentWidth = dotRadius * 2 + fontSize * 0.6 + labelWidth + fontSize * 0.8 + valueWidth;
  const panelWidth = clamp(contentWidth + padding * 2, base * 0.9, base * 2.2);
  const panelHeight =
    padding * 2 + plans.length * rowHeight + Math.max(0, plans.length - 1) * rowGap;

  const panelGap = clamp(base * 0.12, 6, 24);
  const x =
    panelSide === "left"
      ? -panelGap - panelWidth
      : width + panelGap;
  const y = height / 2 - panelHeight / 2;

  const rows: DisplayPanelRow[] = plans.map((plan, index) => {
    const rowY = y + padding + index * (rowHeight + rowGap);
    const label = panelLabel(plan.source);
    const valueWidth = estimateTextWidth(plan.source.text, fontSize);
    const textX = x + padding + dotRadius * 2 + fontSize * 0.6;
    const valueX = x + panelWidth - padding;
    return {
      key: plan.source.key,
      kind: plan.source.kind,
      color: plan.source.color,
      label,
      text: plan.source.text,
      ratio: plan.source.ratio,
      interactive: plan.source.interactive,
      opacity: plan.style.opacity,
      x: x + padding,
      y: rowY,
      width: panelWidth - padding * 2,
      height: rowHeight,
      dotX: x + padding + dotRadius,
      dotY: rowY + rowHeight / 2,
      dotRadius,
      textX,
      valueX,
      valueWidth,
      labelWidth: Math.max(0, valueX - textX - valueWidth - fontSize * 0.5),
    };
  });

  return {
    x,
    y,
    width: panelWidth,
    height: panelHeight,
    cornerRadius: fontSize * 0.6,
    padding,
    fontSize,
    rows,
  };
}

/** 状态栏里显示的名字：颜色标记没有自己的标签，用颜色名占位 */
function panelLabel(source: TokenDisplaySource) {
  return source.kind === "status" ? source.label : source.label || source.text;
}

/**
 * 按锚点把一个元素放到指示物内侧。
 * 返回元素外框的左上角坐标。`index` 是同一锚点上的第几个元素。
 *
 * 上 / 下两条带留出 8% 的边距：贴到最边缘时椭圆形的环会急剧收窄，
 * 条形只能缩成一小截，抬高一点就落在最宽的区域里。
 */
export function anchorPosition(
  anchor: Exclude<TokenDisplayAnchor, "auto" | "ring" | "panel">,
  index: number,
  size: { width: number; height: number },
  layout: {
    box: { x: number; y: number; width: number; height: number };
    gap: number;
    padding: number;
  }
): { x: number; y: number } {
  const { box, gap, padding } = layout;
  const step = (axis: "x" | "y") =>
    (axis === "x" ? size.width : size.height) + gap;
  const left = box.x + padding;
  const right = box.x + box.width - padding - size.width;
  const top = box.y + padding;
  const bottom = box.y + box.height - padding - size.height;
  const bandTop = box.y + box.height * 0.13;
  const bandBottom = box.y + box.height * 0.87 - size.height;

  switch (anchor) {
    case "top":
      return {
        x: box.x + (box.width - size.width) / 2,
        y: Math.max(top, bandTop) + index * step("y"),
      };
    case "bottom":
      return {
        x: box.x + (box.width - size.width) / 2,
        y: Math.min(bottom, bandBottom) - index * step("y"),
      };
    case "left":
      return {
        x: left,
        y: box.y + (box.height - size.height) / 2 + index * step("y"),
      };
    case "right":
      return {
        x: right,
        y: box.y + (box.height - size.height) / 2 + index * step("y"),
      };
    case "inside":
    default:
      return {
        x: box.x + (box.width - size.width) / 2,
        y: box.y + (box.height - size.height) / 2 + index * step("y"),
      };
  }
}
