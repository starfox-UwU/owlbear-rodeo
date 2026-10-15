import Case from "case";

import GalaxyDice from "./galaxy/GalaxyDice";
import IronDice from "./iron/IronDice";
import NebulaDice from "./nebula/NebulaDice";
import SunriseDice from "./sunrise/SunriseDice";
import SunsetDice from "./sunset/SunsetDice";
import WalnutDice from "./walnut/WalnutDice";
import GlassDice from "./glass/GlassDice";
import GemstoneDice from "./gemstone/GemstoneDice";

import GalaxyPreview from "./galaxy/preview.png";
import IronPreview from "./iron/preview.png";
import NebulaPreview from "./nebula/preview.png";
import SunrisePreview from "./sunrise/preview.png";
import SunsetPreview from "./sunset/preview.png";
import WalnutPreview from "./walnut/preview.png";
import GlassPreview from "./glass/preview.png";
import GemstonePreview from "./gemstone/preview.png";
import Dice from "./Dice";

import { DefaultDice } from "../types/Dice";
import type { TranslationKey } from "../i18n/core";

type DiceClasses = Record<string, typeof Dice>;

export const diceClasses: DiceClasses = {
  galaxy: GalaxyDice,
  nebula: NebulaDice,
  sunrise: SunriseDice,
  sunset: SunsetDice,
  iron: IronDice,
  walnut: WalnutDice,
  glass: GlassDice,
  gemstone: GemstoneDice,
};

type DicePreview = Record<string, string>;

export const dicePreviews: DicePreview = {
  galaxy: GalaxyPreview,
  nebula: NebulaPreview,
  sunrise: SunrisePreview,
  sunset: SunsetPreview,
  iron: IronPreview,
  walnut: WalnutPreview,
  glass: GlassPreview,
  gemstone: GemstonePreview,
};

export const dice: DefaultDice[] = Object.keys(diceClasses).map((key) => ({
  key,
  name: Case.capital(key),
  class: diceClasses[key],
  preview: dicePreviews[key],
}));

/**
 * 骰子样式名的本地化键。
 *
 * `dice[].name` 仍是 `Case.capital(key)` 的英文原名（非 UI 场景/兜底用）；
 * 界面展示时请用这里的键调用 `t()`，例如 `t(diceNameKeys[dice.key])`。
 * 之所以不改 `DefaultDice` 类型，是因为该类型由 `src/types/Dice.ts` 定义。
 */
export const diceNameKeys: Record<string, TranslationKey> = {
  galaxy: "dice.styles.galaxy",
  nebula: "dice.styles.nebula",
  sunrise: "dice.styles.sunrise",
  sunset: "dice.styles.sunset",
  iron: "dice.styles.iron",
  walnut: "dice.styles.walnut",
  glass: "dice.styles.glass",
  gemstone: "dice.styles.gemstone",
};
