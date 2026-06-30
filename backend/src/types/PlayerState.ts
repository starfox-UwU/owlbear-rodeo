import { Timer } from "./Timer.js";
import { Dice } from "./Dice.js";

export type PlayerState = {
  nickname: string;
  timer?: Timer;
  dice: Dice;
  sessionId?: string;
  userId?: string;
};
