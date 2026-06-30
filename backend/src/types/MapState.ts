import { DrawingState } from "./Drawing.js";
import { FogState } from "./Fog.js";
import { Notes } from "./Note.js";
import { TokenNotes } from "./TokenNote.js";
import { TokenStates } from "./TokenState.js";

export type EditFlag = "drawing" | "tokens" | "notes" | "fog";

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
  mapId: string;
};
