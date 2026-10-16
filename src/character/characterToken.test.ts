import { describe, expect, it } from "vitest";

import { summaryToAttributes } from "./characterToken";
import type { CardSummary } from "./types";

function makeSummary(overrides: Partial<CardSummary> = {}): CardSummary {
  return {
    id: "character-1",
    name: "验证勇者",
    player: "Tester",
    edition: "2024",
    level: 3,
    updatedAt: "2026-01-01T00:00:00.000Z",
    size: "M",
    classes: [{ name: "战士", level: 3, subclass: null }],
    abilities: [
      { key: "str", label: "力量", score: 16, modifier: 3, save: 5, saveProficient: true },
      { key: "dex", label: "敏捷", score: 14, modifier: 2, save: 2, saveProficient: false },
      { key: "con", label: "体质", score: 15, modifier: 2, save: 2, saveProficient: false },
      { key: "int", label: "智力", score: 10, modifier: 0, save: 0, saveProficient: false },
      { key: "wis", label: "感知", score: 12, modifier: 1, save: 1, saveProficient: false },
      { key: "cha", label: "魅力", score: 8, modifier: -1, save: -1, saveProficient: false },
    ],
    skills: [],
    weapons: [],
    resources: [],
    coins: { cp: 0, sp: 0, ep: 0, gp: 15, pp: 0 },
    ac: 17,
    initiative: 2,
    speed: 30,
    proficiency: 2,
    passive: 11,
    maxHp: 28,
    hp: { current: 19, temp: 5, max: 28 },
    hitDice: "3d10",
    spellcasting: null,
    inspiration: 0,
    ...overrides,
  };
}

describe("summaryToAttributes", () => {
  it("把 HP 映射成条，并带上当前值与上限", () => {
    const attributes = summaryToAttributes(makeSummary(), "user-1");
    const hp = attributes.bars.find((bar) => bar.label === "HP");
    expect(hp).toBeDefined();
    expect(hp?.current).toBe(19);
    expect(hp?.max).toBe(28);
    expect(attributes.updatedBy).toBe("user-1");
  });

  it("临时 HP 大于 0 时单独出一条，否则不出现", () => {
    const withTemp = summaryToAttributes(makeSummary(), "user-1");
    expect(withTemp.bars.some((bar) => bar.label === "临时HP")).toBe(true);

    const withoutTemp = summaryToAttributes(
      makeSummary({ hp: { current: 19, temp: 0, max: 28 } }),
      "user-1"
    );
    expect(withoutTemp.bars.some((bar) => bar.label === "临时HP")).toBe(false);
  });

  it("战斗数值与六项属性调整值都在数值列表里", () => {
    const labels = summaryToAttributes(makeSummary(), "user-1").values.map(
      (value) => value.label
    );
    for (const label of ["AC", "先攻", "速度", "熟练", "被动察觉", "生命骰"]) {
      expect(labels).toContain(label);
    }
    for (const label of ["力量", "敏捷", "体质", "智力", "感知", "魅力"]) {
      expect(labels).toContain(label);
    }
  });

  it("没有施法能力时不写法术条目", () => {
    const labels = summaryToAttributes(makeSummary(), "user-1").values.map(
      (value) => value.label
    );
    expect(labels).not.toContain("法术DC");
  });

  it("有施法能力时写入 DC 与攻击加值", () => {
    const attributes = summaryToAttributes(
      makeSummary({
        spellcasting: { ability: "int", abilityLabel: "智力", dc: 14, attack: 6 },
      }),
      "user-1"
    );
    const dc = attributes.values.find((value) => value.label === "法术DC");
    const attack = attributes.values.find((value) => value.label === "法术攻击");
    expect(dc?.value).toBe(14);
    expect(attack?.value).toBe(6);
  });

  it("HP 上限为 0 时兜底为 1，避免出现除零的条", () => {
    const attributes = summaryToAttributes(
      makeSummary({ hp: { current: 0, temp: 0, max: 0 }, maxHp: 0 }),
      "user-1"
    );
    const hp = attributes.bars.find((bar) => bar.label === "HP");
    expect(hp?.max).toBe(1);
  });
});
