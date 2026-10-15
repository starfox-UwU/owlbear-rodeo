import { DrawingState } from "./Drawing.js";
import { FogState } from "./Fog.js";
import { Notes } from "./Note.js";
import { TokenNotes } from "./TokenNote.js";
import { TokenStates } from "./TokenState.js";

export type EditFlag = "drawing" | "tokens" | "notes" | "fog";

/**
 * 物件权限状态。
 *
 * 后端只负责转存 / 转发，不参与判权（本版本的权限系统是前端拦截），
 * 所以这里保持宽松结构，避免前端新增字段时后端把它当成未知字段丢掉。
 */
export type PermissionState = {
  defaults?: Record<string, unknown>;
  items?: Record<string, unknown>;
};

export type MapState = {
  tokens: TokenStates;
  drawings: DrawingState;
  fogs: FogState;
  templates?: Record<string, any>;
  editFlags: Array<EditFlag>;
  notes: Notes;
  tokenNotes: TokenNotes;
  walls?: Record<string, any>;
  explored?: number[][][][];
  fogEnabled?: boolean;
  showExplored?: boolean;
  permissions?: PermissionState;
  mapId: string;
};
