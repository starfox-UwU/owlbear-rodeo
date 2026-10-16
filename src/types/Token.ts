import Konva from "konva";
import { Outline } from "./Outline";
import { TokenAttributeState, TokenDisplayConfig } from "./TokenState";

export type TokenCategory = "character" | "vehicle" | "prop" | "attachment";

export type BaseToken = {
  id: string;
  name: string;
  defaultSize: number;
  defaultCategory: TokenCategory;
  defaultLabel: string;
  defaultAttributes?: TokenAttributeState;
  /** 由该模板创建指示物时套用的状态展示配置 */
  defaultDisplay?: TokenDisplayConfig;
  hideInSidebar: boolean;
  width: number;
  height: number;
  owner: string;
  created: number;
  lastModified: number;
  outline: Outline;
  /**
   * 由角色卡生成时记录来源角色 id，用于「重新同步数值 / 重新同步头像」。
   * 手动创建的 Token 不带这个字段。
   */
  characterId?: string;
};

export type DefaultToken = BaseToken & {
  type: "default";
  key: string;
};

export type FileToken = BaseToken & {
  type: "file";
  file: string;
  thumbnail: string;
};

export type Token = DefaultToken | FileToken;

export type TokenMenuOptions = {
  tokenStateId: string;
  tokenImage: Konva.Node;
  focus: boolean;
};

export type TokenDraggingOptions = {
  dragging: boolean;
  tokenStateId: string;
  attachedTokenStateIds: string[];
};
