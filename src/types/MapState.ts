import { DrawingState } from "./Drawing";
import { FogState } from "./Fog";
import { Notes } from "./Note";
import { PermissionState } from "./Permission";
import { TokenNotes } from "./TokenNote";
import { SpellTemplateState } from "./SpellTemplate";
import { TokenStates } from "./TokenState";
import { WallState } from "./Wall";

export type EditFlag = "drawing" | "tokens" | "notes" | "fog";

export type ExploredState = number[][][][];

export type MapState = {
  tokens: TokenStates;
  drawings: DrawingState;
  fogs: FogState;
  templates: SpellTemplateState;
  editFlags: Array<EditFlag>;
  notes: Notes;
  tokenNotes: TokenNotes;
  walls?: WallState;
  explored?: ExploredState;
  fogEnabled?: boolean;
  showExplored?: boolean;
  /**
   * 物件权限。房主没配置过时不存在，此时行为等同于旧版 `editFlags`。
   * 见 `src/helpers/permissions.ts`。
   */
  permissions?: PermissionState;
  mapId: string;
};
