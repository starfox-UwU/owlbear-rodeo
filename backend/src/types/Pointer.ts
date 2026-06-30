import { Vector2 } from "./Vector2.js";
import { Color } from "./Color.js";

export type Pointer = {
  position: Vector2;
  visible: boolean;
  id: string;
  color: Color;
  time: number;
};
