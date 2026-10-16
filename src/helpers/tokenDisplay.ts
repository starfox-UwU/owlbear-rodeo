import colors, { Color } from "./colors";
import {
  ResolvedTokenDisplayStyle,
  TokenAttributeBar,
  TokenAttributeValue,
  TokenDisplayAnchor,
  TokenDisplayConfig,
  TokenDisplayItemStyle,
  TokenDisplayKind,
  TokenDisplayKindDefaults,
  TokenDisplayStyle,
  TokenDisplayTrigger,
} from "../types/TokenState";

/**
 * 指示物状态展示的纯逻辑层。
 *
 * 配置解析优先级（就近覆盖）：
 *   单项覆盖 → 本指示物按类型默认 → 全局默认 → 内置默认
 *
 * 这里不碰 Konva，方便单测；排版计算见 `tokenDisplayLayout.ts`。
 */

export const DISPLAY_KINDS: TokenDisplayKind[] = ["status", "bar", "value"];

export const DISPLAY_ANCHORS: TokenDisplayAnchor[] = [
  "auto",
  "ring",
  "top",
  "bottom",
  "left",
  "right",
  "inside",
];

export const DISPLAY_TRIGGERS: TokenDisplayTrigger[] = [
  "always",
  "hover",
  "selected",
];

/** 每种状态可用的样式，避免出现「颜色标记画成进度条」这类无意义组合 */
export const DISPLAY_STYLES_BY_KIND: Record<TokenDisplayKind, TokenDisplayStyle[]> = {
  status: ["ring", "badge", "chip"],
  bar: ["ring", "bar", "badge", "chip", "text"],
  value: ["ring", "badge", "chip", "text"],
};

/** 每种样式可用的锚点 */
export const DISPLAY_ANCHORS_BY_STYLE: Record<TokenDisplayStyle, TokenDisplayAnchor[]> = {
  ring: ["auto", "ring"],
  bar: ["auto", "top", "bottom", "inside"],
  chip: ["auto", "top", "bottom", "left", "right", "inside"],
  badge: ["auto", "ring", "top", "bottom", "left", "right", "inside"],
  text: ["auto", "top", "bottom", "left", "right", "inside"],
};

/** 样式缺省锚点 */
export const DEFAULT_ANCHOR_BY_STYLE: Record<TokenDisplayStyle, Exclude<TokenDisplayAnchor, "auto">> = {
  ring: "ring",
  bar: "bottom",
  chip: "bottom",
  badge: "ring",
  text: "bottom",
};

export const BUILTIN_DISPLAY_DEFAULTS: TokenDisplayKindDefaults = {
  status: {
    visible: true,
    style: "ring",
    anchor: "auto",
    order: 0,
    scale: 1,
    opacity: 0.85,
    trigger: "always",
  },
  bar: {
    visible: true,
    style: "bar",
    anchor: "auto",
    order: 0,
    scale: 1,
    opacity: 1,
    trigger: "always",
  },
  value: {
    visible: true,
    style: "badge",
    anchor: "auto",
    order: 0,
    scale: 1,
    opacity: 1,
    trigger: "always",
  },
};

export const MIN_DISPLAY_SCALE = 0.4;
export const MAX_DISPLAY_SCALE = 2.5;

export function statusDisplayKey(color: string) {
  return `status:${color}`;
}

export function barDisplayKey(id: string) {
  return `bar:${id}`;
}

export function valueDisplayKey(id: string) {
  return `value:${id}`;
}

export function parseDisplayKey(
  key: string
): { kind: TokenDisplayKind; id: string } | null {
  const separator = key.indexOf(":");
  if (separator <= 0) {
    return null;
  }
  const kind = key.slice(0, separator);
  const id = key.slice(separator + 1);
  if ((kind !== "status" && kind !== "bar" && kind !== "value") || !id) {
    return null;
  }
  return { kind, id };
}

export function displayKeyKind(key: string): TokenDisplayKind | undefined {
  return parseDisplayKey(key)?.kind;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function normalizeScale(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.round(clamp(value, MIN_DISPLAY_SCALE, MAX_DISPLAY_SCALE) * 100) / 100;
}

function normalizeOpacity(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.round(clamp(value, 0.05, 1) * 100) / 100;
}

function normalizeOrder(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return clamp(Math.round(value), -99, 99);
}

function normalizeStyle(
  value: unknown,
  kind: TokenDisplayKind,
  fallback: TokenDisplayStyle
): TokenDisplayStyle {
  const allowed = DISPLAY_STYLES_BY_KIND[kind];
  if (typeof value === "string" && (allowed as string[]).includes(value)) {
    return value as TokenDisplayStyle;
  }
  return allowed.includes(fallback) ? fallback : allowed[0];
}

/** 锚点保留 `auto` 原样，等最终输出时再落成具体锚点 */
function normalizeAnchor(
  value: unknown,
  style: TokenDisplayStyle,
  fallback: TokenDisplayAnchor
): TokenDisplayAnchor {
  const allowed = DISPLAY_ANCHORS_BY_STYLE[style];
  if (typeof value === "string" && (allowed as string[]).includes(value)) {
    return value as TokenDisplayAnchor;
  }
  const resolvedFallback = allowed.includes(fallback)
    ? fallback
    : DEFAULT_ANCHOR_BY_STYLE[style];
  return resolvedFallback;
}

function normalizeTrigger(
  value: unknown,
  fallback: TokenDisplayTrigger
): TokenDisplayTrigger {
  if (value === "always" || value === "hover" || value === "selected") {
    return value;
  }
  return fallback;
}

type CompleteStyle = Required<TokenDisplayItemStyle>;

/** 把可能不完整的样式补全，字段缺失时沿用 base */
function completeStyle(
  base: CompleteStyle,
  partial: Partial<TokenDisplayItemStyle> | undefined,
  kind: TokenDisplayKind
): CompleteStyle {
  if (!partial) {
    return base;
  }
  const style = normalizeStyle(partial.style, kind, base.style);
  return {
    visible: typeof partial.visible === "boolean" ? partial.visible : base.visible,
    style,
    anchor: normalizeAnchor(partial.anchor, style, base.anchor),
    order: normalizeOrder(partial.order, base.order),
    scale: normalizeScale(partial.scale, base.scale),
    opacity: normalizeOpacity(partial.opacity, base.opacity),
    trigger: normalizeTrigger(partial.trigger, base.trigger),
  };
}

function builtinComplete(kind: TokenDisplayKind): CompleteStyle {
  const builtin = BUILTIN_DISPLAY_DEFAULTS[kind];
  return {
    visible: builtin.visible,
    style: builtin.style,
    anchor: builtin.anchor ?? "auto",
    order: builtin.order ?? 0,
    scale: builtin.scale ?? 1,
    opacity: builtin.opacity ?? 1,
    trigger: builtin.trigger ?? "always",
  };
}

/** 把「可能不完整」的默认规则补全成完整规则，缺字段用内置默认 */
export function normalizeDisplayDefaults(
  partial?: Partial<TokenDisplayKindDefaults> | null
): TokenDisplayKindDefaults {
  const result = {} as TokenDisplayKindDefaults;
  for (const kind of DISPLAY_KINDS) {
    result[kind] = completeStyle(builtinComplete(kind), partial?.[kind], kind);
  }
  return result;
}

/** 把带 `auto` 的样式落成最终可渲染的规则 */
export function resolveStyle(style: CompleteStyle, kind: TokenDisplayKind): ResolvedTokenDisplayStyle {
  const normalized = completeStyle(builtinComplete(kind), style, kind);
  return {
    ...normalized,
    anchor:
      normalized.anchor && normalized.anchor !== "auto"
        ? (normalized.anchor as Exclude<TokenDisplayAnchor, "auto">)
        : DEFAULT_ANCHOR_BY_STYLE[normalized.style],
  };
}

/** 解析某个条目最终生效的展示规则 */
export function resolveDisplayStyle(
  config: TokenDisplayConfig | undefined,
  globalDefaults: TokenDisplayKindDefaults | undefined,
  kind: TokenDisplayKind,
  key: string
): ResolvedTokenDisplayStyle {
  let style = builtinComplete(kind);
  const global = globalDefaults?.[kind];
  if (global) {
    style = completeStyle(style, global, kind);
  }
  const ownDefault = config?.defaults?.[kind];
  if (ownDefault) {
    style = completeStyle(style, ownDefault, kind);
  }
  const item = findDisplayItemStyle(config, key);
  if (item) {
    style = completeStyle(style, item, kind);
  }
  return resolveStyle(style, kind);
}

export function findDisplayItemStyle(
  config: TokenDisplayConfig | undefined,
  key: string
): TokenDisplayItemStyle | undefined {
  return config?.items?.find((item) => item.key === key);
}

export function hasItemOverride(
  config: TokenDisplayConfig | undefined,
  key: string
) {
  return !!findDisplayItemStyle(config, key);
}

export function hasKindOverride(
  config: TokenDisplayConfig | undefined,
  kind: TokenDisplayKind
) {
  return !!config?.defaults?.[kind];
}

export function createDisplayConfig(
  userId: string,
  now = Date.now()
): TokenDisplayConfig {
  return {
    defaults: {},
    items: [],
    version: 0,
    updatedAt: now,
    updatedBy: userId || "unknown",
  };
}

export function cloneDisplayConfig(
  config: TokenDisplayConfig | undefined,
  userId: string,
  now = Date.now(),
  options?: { keepItems?: boolean }
): TokenDisplayConfig {
  return {
    defaults: { ...(config?.defaults ?? {}) },
    // 模板里的单项覆盖是按属性 id 记的，而属性在创建时会被换成新 id，
    // 默认按类型规则照搬，单项覆盖丢弃。
    items: options?.keepItems === false ? [] : (config?.items ?? []).map((item) => ({ ...item })),
    version: 0,
    updatedAt: now,
    updatedBy: userId || config?.updatedBy || "unknown",
  };
}

function touch(
  config: TokenDisplayConfig | undefined,
  userId: string,
  now: number
): TokenDisplayConfig {
  return {
    defaults: { ...(config?.defaults ?? {}) },
    items: (config?.items ?? []).map((item) => ({ ...item })),
    version: config?.version ?? 0,
    updatedAt: now,
    updatedBy: userId || config?.updatedBy || "unknown",
  };
}

/** 设置单项覆盖；已有则合并 */
export function setItemStyle(
  config: TokenDisplayConfig | undefined,
  key: string,
  kind: TokenDisplayKind,
  patch: Partial<TokenDisplayItemStyle>,
  userId: string,
  now = Date.now()
): TokenDisplayConfig {
  const next = touch(config, userId, now);
  const index = next.items.findIndex((item) => item.key === key);
  if (index < 0) {
    next.items.push({ key, ...BUILTIN_DISPLAY_DEFAULTS[kind], ...patch });
    return next;
  }
  next.items[index] = { ...next.items[index], ...patch };
  return next;
}

/** 移除单项覆盖，回退到按类型默认 */
export function resetItemStyle(
  config: TokenDisplayConfig | undefined,
  key: string,
  userId: string,
  now = Date.now()
): TokenDisplayConfig {
  const next = touch(config, userId, now);
  next.items = next.items.filter((item) => item.key !== key);
  return next;
}

/** 设置某一类的默认规则 */
export function setKindDefault(
  config: TokenDisplayConfig | undefined,
  kind: TokenDisplayKind,
  patch: Partial<TokenDisplayItemStyle>,
  userId: string,
  now = Date.now()
): TokenDisplayConfig {
  const next = touch(config, userId, now);
  const current = next.defaults[kind] ?? BUILTIN_DISPLAY_DEFAULTS[kind];
  next.defaults = { ...next.defaults, [kind]: { ...current, ...patch } };
  return next;
}

/** 清空某一类的默认规则，回退到全局 / 内置默认 */
export function resetKindDefault(
  config: TokenDisplayConfig | undefined,
  kind: TokenDisplayKind,
  userId: string,
  now = Date.now()
): TokenDisplayConfig {
  const next = touch(config, userId, now);
  const defaults = { ...(next.defaults ?? {}) };
  delete defaults[kind];
  next.defaults = defaults;
  return next;
}

/**
 * 清掉已经不存在条目的单项覆盖。
 * 属性条 / 数值被删掉后，配置里不应该留下幽灵规则。
 */
export function pruneDisplayConfig(
  config: TokenDisplayConfig | undefined,
  validKeys: string[],
  userId: string,
  now = Date.now()
): TokenDisplayConfig | undefined {
  const items = config?.items ?? [];
  const valid = new Set(validKeys);
  const nextItems = items.filter((item) => valid.has(item.key));
  if (nextItems.length === items.length) {
    return config;
  }
  const next = touch(config, userId, now);
  next.items = nextItems;
  return next;
}

/* ------------------------------------------------------------------ */
/* 从指示物状态里取出可展示条目                                          */
/* ------------------------------------------------------------------ */

export type TokenDisplaySource = {
  key: string;
  kind: TokenDisplayKind;
  /** 条目标题，用于编辑器 */
  label: string;
  color: string;
  /** 展示文本 */
  text: string;
  /** 进度比例，0 ~ 1 */
  ratio: number;
  /** 是否可点击改数值（属性条 / 数值） */
  interactive: boolean;
  bar?: TokenAttributeBar;
  value?: TokenAttributeValue;
};

function formatNumber(value: number) {
  return `${Math.round(value * 10) / 10}`;
}

export function buildBarText(bar: TokenAttributeBar) {
  const currentText = formatNumber(bar.current);
  if (bar.showMinMax && typeof bar.max === "number") {
    return `${currentText}/${formatNumber(bar.max)}`;
  }
  return currentText;
}

export function buildValueText(value: TokenAttributeValue) {
  const raw =
    typeof value.value === "number" ? formatNumber(value.value) : `${value.value}`;
  return raw.trim();
}

export function buildBarRatio(bar: TokenAttributeBar) {
  if (typeof bar.max !== "number") {
    return 1;
  }
  const min = typeof bar.min === "number" ? bar.min : 0;
  const range = bar.max - min;
  if (!Number.isFinite(range) || range <= 0) {
    return 0;
  }
  return Math.min(Math.max((bar.current - min) / range, 0), 1);
}

/**
 * 汇总指示物上可展示的条目（颜色标记 / 属性条 / 数值）。
 * `visibleForViewer` 决定 public/private 过滤，展示配置不参与过滤。
 */
export function collectDisplaySources(
  tokenState: {
    statuses?: Color[];
    attributes?: {
      bars?: TokenAttributeBar[];
      values?: TokenAttributeValue[];
    };
  },
  options: { isMapOwner: boolean; isTokenOwner: boolean }
): TokenDisplaySource[] {
  const sources: TokenDisplaySource[] = [];
  const isVisible = (visibility: "public" | "private" | undefined) =>
    visibility === "private"
      ? options.isMapOwner || options.isTokenOwner
      : true;

  const statuses = [...new Set((tokenState.statuses ?? []).filter((s) => s))];
  for (const status of statuses) {
    sources.push({
      key: statusDisplayKey(status),
      kind: "status",
      label: status,
      color: colors[status] ?? colors.blue,
      text: "",
      ratio: 1,
      interactive: false,
    });
  }

  for (const bar of tokenState.attributes?.bars ?? []) {
    if (!isVisible(bar.visibility)) {
      continue;
    }
    sources.push({
      key: barDisplayKey(bar.id),
      kind: "bar",
      label: bar.label,
      color: bar.color || colors.red,
      text: buildBarText(bar),
      ratio: buildBarRatio(bar),
      interactive: true,
      bar,
    });
  }

  for (const value of tokenState.attributes?.values ?? []) {
    if (!isVisible(value.visibility)) {
      continue;
    }
    sources.push({
      key: valueDisplayKey(value.id),
      kind: "value",
      label: value.label,
      color: value.color || colors.blue,
      text: buildValueText(value),
      ratio: 1,
      interactive: true,
      value,
    });
  }

  return sources;
}
