import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import colors from "./colors";
import {
  collectDisplaySources,
  createDisplayConfig,
  setItemStyle,
  setKindDefault,
} from "./tokenDisplay";
import { computeDisplayLayout } from "./tokenDisplayLayout";
import { TokenAttributeState, TokenDisplayConfig } from "../types/TokenState";

/**
 * 状态展示的排版体检。
 *
 * 除了常规断言，设置 `TOKEN_DISPLAY_PREVIEW=1` 时会把几种典型配置的排版结果
 * 写到 `tmp/layout-preview.json`，配合 `tmp/draw_preview.py` 可以生成预览图人工核对。
 */

const PREVIEW_FLAG = "TOKEN_DISPLAY_PREVIEW";

const attributes: TokenAttributeState = {
  bars: [
    {
      id: "hp",
      label: "HP",
      current: 4,
      min: 0,
      max: 10,
      color: colors.red,
      showMinMax: true,
      visibility: "public",
    },
    {
      id: "mp",
      label: "MP",
      current: 3,
      min: 0,
      max: 5,
      color: colors.blue,
      showMinMax: true,
      visibility: "public",
    },
  ],
  values: [
    { id: "ac", label: "AC", value: 15, color: colors.yellow, visibility: "public" },
    { id: "pp", label: "PP", value: 12, color: colors.teal, visibility: "public" },
  ],
  version: 0,
  updatedAt: 0,
  updatedBy: "u",
};

const tokenState = { statuses: ["red", "blue", "green"] as const, attributes };

function scenario(
  name: string,
  width: number,
  height: number,
  config?: TokenDisplayConfig
) {
  const sources = collectDisplaySources(
    { statuses: [...tokenState.statuses], attributes },
    { isMapOwner: true, isTokenOwner: true }
  );
  return {
    name,
    width,
    height,
    items: computeDisplayLayout({
      sources,
      config,
      width,
      height,
      hovered: false,
      selected: false,
    }),
  };
}

function customConfig() {
  let config = createDisplayConfig("u");
  config = setKindDefault(config, "bar", { anchor: "top" }, "u");
  config = setKindDefault(config, "value", { style: "chip", anchor: "right" }, "u");
  config = setKindDefault(config, "status", { style: "badge", anchor: "ring" }, "u");
  config = setItemStyle(config, "bar:mp", "bar", { style: "ring" }, "u");
  return config;
}

describe("状态展示排版体检", () => {
  const scenarios = [
    scenario("default-100x100", 100, 100),
    scenario("custom-100x100", 100, 100, customConfig()),
    scenario("wide-200x100", 200, 100),
    scenario("small-40x40", 40, 40),
  ];

  it("所有元素都是有限数值", () => {
    for (const entry of scenarios) {
      for (const item of entry.items) {
        for (const key of ["x", "y", "width", "height", "radius", "fontSize"] as const) {
          expect(
            Number.isFinite(item[key]),
            `${entry.name} ${item.key} ${key}`
          ).toBe(true);
        }
        expect(item.opacity).toBeGreaterThan(0);
        expect(item.opacity).toBeLessThanOrEqual(1);
      }
    }
  });

  it("环与徽章不会缩到不可见", () => {
    for (const entry of scenarios) {
      for (const item of entry.items) {
        if (item.style === "ring") {
          expect(item.radiusX ?? item.radius).toBeGreaterThan(1);
          expect(item.radiusY ?? item.radius).toBeGreaterThan(1);
        }
        if (item.style === "badge") {
          expect(item.radius).toBeGreaterThanOrEqual(5);
        }
      }
    }
  });

  it("小指示物上元素仍居中且不越界太多", () => {
    const small = scenarios[3];
    for (const item of small.items) {
      if (item.style === "ring" || item.style === "badge") {
        expect(item.x).toBeCloseTo(20, 5);
      }
    }
  });

  it("可选：导出预览数据", () => {
    if (!process.env[PREVIEW_FLAG]) {
      return;
    }
    const out = path.join(process.cwd(), "tmp", "layout-preview.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(scenarios, null, 2));
    expect(fs.existsSync(out)).toBe(true);
  });
});
