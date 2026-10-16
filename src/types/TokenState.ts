import { Color } from "../helpers/colors";
import { Outline } from "./Outline";
import { TokenCategory } from "./Token";

export type LightConfig = {
  enabled: boolean;
  radiusBright: number;
  radiusDim?: number;
  color?: string;
};

export type TokenAttributeVisibility = "public" | "private";

export type TokenAttributeBar = {
  id: string;
  label: string;
  current: number;
  min?: number;
  max?: number;
  color: string;
  showMinMax?: boolean;
  visibility?: TokenAttributeVisibility;
};

export type TokenAttributeValue = {
  id: string;
  label: string;
  value: number | string;
  color?: string;
  visibility?: TokenAttributeVisibility;
};

export type TokenAttributeState = {
  bars: TokenAttributeBar[];
  values: TokenAttributeValue[];
  version: number;
  updatedAt: number;
  updatedBy: string;
};

/**
 * 状态展示系统
 * ------------------------------------------------------------------
 * 指示物身上的「状态」共三类：
 * - `status`：`statuses` 里的颜色标记
 * - `bar`：属性条（有当前值 / 最值）
 * - `value`：单独数值
 *
 * 每一类都可以自由选择「是否显示 / 用什么样式 / 放在哪 / 多大 / 什么时候显示」。
 * 配置分三层，就近覆盖：单项 > 本指示物按类型 > 全局默认 > 内置默认。
 * 见 `src/helpers/tokenDisplay.ts`。
 */
export type TokenDisplayKind = "status" | "bar" | "value";

/** 展示样式。`ring` 对属性条是进度环，对标记 / 数值是纯色环 */
export type TokenDisplayStyle = "ring" | "bar" | "badge" | "chip" | "text";

/** 展示锚点，`auto` 交给样式自己决定，`panel` 表示放进悬停状态栏 */
export type TokenDisplayAnchor =
  | "auto"
  | "ring"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "inside"
  | "panel";

/** 什么时候显示 */
export type TokenDisplayTrigger = "always" | "hover" | "selected";

export type TokenDisplayItemStyle = {
  visible: boolean;
  style: TokenDisplayStyle;
  anchor?: TokenDisplayAnchor;
  /** 越小越靠前（环上从正上方顺时针，条 / 徽章从锚点起点往外） */
  order?: number;
  /** 相对默认尺寸的缩放 */
  scale?: number;
  /** 不透明度 */
  opacity?: number;
  trigger?: TokenDisplayTrigger;
};

/** 单项覆盖，`key` 形如 `status:red` / `bar:<id>` / `value:<id>` */
export type TokenDisplayItem = TokenDisplayItemStyle & {
  key: string;
};

/** 按类型的默认规则 */
export type TokenDisplayKindDefaults = {
  status: TokenDisplayItemStyle;
  bar: TokenDisplayItemStyle;
  value: TokenDisplayItemStyle;
};

export type TokenDisplayConfig = {
  /** 按类型覆盖，缺省时回退到全局默认 */
  defaults: Partial<TokenDisplayKindDefaults>;
  /** 单项覆盖 */
  items: TokenDisplayItem[];
  version: number;
  updatedAt: number;
  updatedBy: string;
};

/** 解析后的最终样式，所有字段都有值 */
export type ResolvedTokenDisplayStyle = {
  visible: boolean;
  style: TokenDisplayStyle;
  anchor: Exclude<TokenDisplayAnchor, "auto">;
  order: number;
  scale: number;
  opacity: number;
  trigger: TokenDisplayTrigger;
};

export type BaseTokenState = {
  id: string;
  tokenId: string;
  owner: string;
  size: number;
  category: TokenCategory;
  label: string;
  statuses: Color[];
  attributes?: TokenAttributeState;
  display?: TokenDisplayConfig;
  x: number;
  y: number;
  lastModifiedBy: string;
  lastModified: number;
  rotation: number;
  locked: boolean;
  visible: boolean;
  outline: Outline;
  width: number;
  height: number;
  hasVision?: boolean;
  visionRange?: number;
  visionAngle?: number;
  lightConfig?: LightConfig;
};

export type DefaultTokenState = BaseTokenState & {
  type: "default";
  key: string;
};

export type FileTokenState = BaseTokenState & {
  type: "file";
  file: string;
};

export type TokenState = DefaultTokenState | FileTokenState;

export type TokenStates = Record<string, TokenState>;
