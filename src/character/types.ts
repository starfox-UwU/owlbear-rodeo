/**
 * 角色卡（character-card 子应用）通过 postMessage 暴露给本项目的轻量数据结构。
 *
 * 这里刻意不引入子应用的任何代码：两侧只有消息协议耦合。
 * 完整角色快照（含上万个规则条目）只在需要备份时按需传输，
 * 常规同步只走下面的摘要，避免大对象卡住界面。
 */

export type CardAbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type CardAbilityLine = {
  key: CardAbilityKey;
  label: string;
  score: number;
  modifier: number;
  save: number;
  saveProficient: boolean;
};

export type CardSkillLine = {
  key: string;
  label: string;
  ability: CardAbilityKey;
  value: number;
  proficient: boolean;
  expertise: boolean;
};

export type CardWeaponLine = {
  key: string;
  name: string;
  attack: string;
  damage: string;
};

export type CardResourceLine = {
  id: string;
  name: string;
  current: number;
  max: number;
  unlimited: boolean;
};

export type CardSummary = {
  id: string;
  name: string;
  player: string;
  edition: "2014" | "2024";
  level: number;
  updatedAt: string;
  size: string | null;
  classes: { name: string; level: number; subclass: string | null }[];
  abilities: CardAbilityLine[];
  skills: CardSkillLine[];
  weapons: CardWeaponLine[];
  resources: CardResourceLine[];
  coins: Record<string, number>;
  ac: number;
  initiative: number;
  speed: number;
  proficiency: number;
  passive: number;
  maxHp: number;
  hp: { current: number; temp: number; max: number };
  hitDice: string;
  spellcasting: {
    ability: CardAbilityKey | null;
    abilityLabel: string | null;
    dc: number;
    attack: number;
  } | null;
  inspiration: number;
  /** 卡片头像（data URL），仅 `summary()` 请求返回。 */
  portrait?: string;
};

export type CardBridgeEvent = {
  event: string;
  data?: unknown;
};

export type ImportResult = { added: number; updated: number; ids: string[] };
