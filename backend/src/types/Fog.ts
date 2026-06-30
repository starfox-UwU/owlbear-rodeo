import { Vector2 } from "./Vector2.js";
import { Color } from "./Color.js";

export type FogData = {
  points: Vector2[];
  holes: Vector2[][];
};

export type Fog = {
  color: Color;
  data: FogData;
  id: string;
  strokeWidth: number;
  type: "fog";
  visible: boolean;
};

export type FogState = Record<string, Fog>;
