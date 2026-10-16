import { describe, expect, it } from "vitest";

import colors, { Color } from "./colors";
import {
  BUILTIN_DISPLAY_DEFAULTS,
  barDisplayKey,
  collectDisplaySources,
  createDisplayConfig,
  normalizeDisplayDefaults,
  parseDisplayKey,
  pruneDisplayConfig,
  resetItemStyle,
  resetKindDefault,
  resolveDisplayStyle,
  setItemStyle,
  setKindDefault,
  statusDisplayKey,
  valueDisplayKey,
} from "./tokenDisplay";
import { computeDisplayLayout } from "./tokenDisplayLayout";
import { TokenAttributeBar, TokenAttributeValue } from "../types/TokenState";

const USER = "user-1";

function makeBar(overrides: Partial<TokenAttributeBar> = {}): TokenAttributeBar {
  return {
    id: "bar-1",
    label: "HP",
    current: 4,
    min: 0,
    max: 10,
    color: colors.red,
    showMinMax: true,
    visibility: "public",
    ...overrides,
  };
}

function makeValue(
  overrides: Partial<TokenAttributeValue> = {}
): TokenAttributeValue {
  return {
    id: "value-1",
    label: "AC",
    value: 15,
    color: colors.blue,
    visibility: "public",
    ...overrides,
  };
}

describe("tokenDisplay keys", () => {
  it("构造并解析条目 key", () => {
    expect(statusDisplayKey("red")).toBe("status:red");
    expect(barDisplayKey("abc")).toBe("bar:abc");
    expect(valueDisplayKey("abc")).toBe("value:abc");
  });

  it("解析非法 key 返回 null", () => {
    expect(parseDisplayKey("nope")).toBeNull();
    expect(parseDisplayKey("")).toBeNull();
    expect(parseDisplayKey("other:1")).toBeNull();
    expect(parseDisplayKey("bar:")).toBeNull();
  });

  it("解析合法 key", () => {
    expect(parseDisplayKey("status:red")).toEqual({ kind: "status", id: "red" });
    expect(parseDisplayKey("bar:x1")).toEqual({ kind: "bar", id: "x1" });
    expect(parseDisplayKey("value:y1")).toEqual({ kind: "value", id: "y1" });
  });
});

describe("resolveDisplayStyle", () => {
  it("没有任何配置时使用内置默认", () => {
    const status = resolveDisplayStyle(undefined, undefined, "status", "status:red");
    expect(status.style).toBe("ring");
    expect(status.visible).toBe(true);
    expect(status.anchor).toBe("ring");

    const bar = resolveDisplayStyle(undefined, undefined, "bar", "bar:1");
    expect(bar.style).toBe("bar");
    expect(bar.anchor).toBe("bottom");

    const value = resolveDisplayStyle(undefined, undefined, "value", "value:1");
    expect(value.style).toBe("badge");
    expect(value.anchor).toBe("ring");
  });

  it("按 全局 → 本指示物 → 单项 的顺序覆盖", () => {
    const global = normalizeDisplayDefaults({
      bar: { ...BUILTIN_DISPLAY_DEFAULTS.bar, anchor: "top" },
    });
    const config = setKindDefault(
      createDisplayConfig(USER),
      "bar",
      { anchor: "inside" },
      USER
    );
    const withItem = setItemStyle(
      config,
      "bar:1",
      "bar",
      { anchor: "inside", style: "badge" },
      USER
    );

    expect(
      resolveDisplayStyle(config, global, "bar", "bar:2").anchor
    ).toBe("inside");
    expect(
      resolveDisplayStyle(withItem, global, "bar", "bar:1").anchor
    ).toBe("inside");
    expect(resolveDisplayStyle(withItem, global, "bar", "bar:1").style).toBe(
      "badge"
    );
  });

  it("auto 锚点按样式落成具体锚点", () => {
    const config = setKindDefault(
      createDisplayConfig(USER),
      "value",
      { style: "chip", anchor: "auto" },
      USER
    );
    expect(
      resolveDisplayStyle(config, undefined, "value", "value:1").anchor
    ).toBe("bottom");
  });

  it("不支持的颜色标记样式会退回合法样式", () => {
    const config = setItemStyle(
      createDisplayConfig(USER),
      "status:red",
      "status",
      { style: "bar" as any },
      USER
    );
    expect(
      resolveDisplayStyle(config, undefined, "status", "status:red").style
    ).toBe("ring");
  });

  it("缩放与不透明度会被夹到合理范围", () => {
    const config = setItemStyle(
      createDisplayConfig(USER),
      "bar:1",
      "bar",
      { scale: 99, opacity: 0 },
      USER
    );
    const resolved = resolveDisplayStyle(config, undefined, "bar", "bar:1");
    expect(resolved.scale).toBe(2.5);
    expect(resolved.opacity).toBe(0.05);
  });
});

describe("配置增删", () => {
  it("单项覆盖可以重置", () => {
    const config = setItemStyle(
      createDisplayConfig(USER),
      "bar:1",
      "bar",
      { visible: false },
      USER
    );
    expect(config.items).toHaveLength(1);
    const reset = resetItemStyle(config, "bar:1", USER);
    expect(reset.items).toHaveLength(0);
  });

  it("按类型默认可以重置", () => {
    const config = setKindDefault(createDisplayConfig(USER), "bar", { visible: false }, USER);
    expect(config.defaults.bar?.visible).toBe(false);
    const reset = resetKindDefault(config, "bar", USER);
    expect(reset.defaults.bar).toBeUndefined();
  });

  it("清理掉已删除条目的单项覆盖", () => {
    let config = createDisplayConfig(USER);
    config = setItemStyle(config, "bar:1", "bar", { visible: false }, USER);
    config = setItemStyle(config, "value:1", "value", { visible: false }, USER);
    const pruned = pruneDisplayConfig(config, ["value:1"], USER);
    expect(pruned?.items.map((item) => item.key)).toEqual(["value:1"]);
  });

  it("没有变化时返回原对象", () => {
    const config = setItemStyle(createDisplayConfig(USER), "bar:1", "bar", {}, USER);
    expect(pruneDisplayConfig(config, ["bar:1"], USER)).toBe(config);
  });
});

describe("collectDisplaySources", () => {
  it("汇总标记 / 属性条 / 数值", () => {
    const sources = collectDisplaySources(
      {
        statuses: ["red", "blue"],
        attributes: { bars: [makeBar()], values: [makeValue()] },
      },
      { isMapOwner: false, isTokenOwner: false }
    );
    expect(sources.map((source) => source.key)).toEqual([
      "status:red",
      "status:blue",
      "bar:bar-1",
      "value:value-1",
    ]);
    expect(sources[2].text).toBe("4/10");
    expect(sources[2].ratio).toBeCloseTo(0.4);
    expect(sources[3].text).toBe("15");
  });

  it("过滤掉私密条目（非房主且非拥有者）", () => {
    const state = {
      statuses: ["red"] as Color[],
      attributes: {
        bars: [makeBar({ visibility: "private" })],
        values: [makeValue({ visibility: "private" })],
      },
    };
    expect(
      collectDisplaySources(state, { isMapOwner: false, isTokenOwner: false })
    ).toHaveLength(1);
    expect(
      collectDisplaySources(state, { isMapOwner: true, isTokenOwner: false })
    ).toHaveLength(3);
  });

  it("最大值缺失时比例按满格处理", () => {
    const sources = collectDisplaySources(
      {
        statuses: [],
        attributes: { bars: [makeBar({ max: undefined, showMinMax: false })], values: [] },
      },
      { isMapOwner: true, isTokenOwner: true }
    );
    expect(sources[0].ratio).toBe(1);
    expect(sources[0].text).toBe("4");
  });
});

describe("computeDisplayLayout", () => {
  const baseOptions = {
    width: 100,
    height: 100,
    hovered: false,
    selected: false,
  };

  it("隐藏的条目不会产出布局", () => {
    const config = setItemStyle(
      createDisplayConfig(USER),
      "bar:bar-1",
      "bar",
      { visible: false },
      USER
    );
    const items = computeDisplayLayout({
      ...baseOptions,
      sources: collectDisplaySources(
        { statuses: [], attributes: { bars: [makeBar()], values: [] } },
        { isMapOwner: true, isTokenOwner: true }
      ),
      config,
    });
    expect(items).toHaveLength(0);
  });

  it("悬停 / 选中触发条件生效", () => {
    const config = setItemStyle(
      createDisplayConfig(USER),
      "value:value-1",
      "value",
      { trigger: "hover" },
      USER
    );
    const sources = collectDisplaySources(
      { statuses: [], attributes: { bars: [], values: [makeValue()] } },
      { isMapOwner: true, isTokenOwner: true }
    );
    expect(computeDisplayLayout({ ...baseOptions, sources, config })).toHaveLength(0);
    expect(
      computeDisplayLayout({ ...baseOptions, sources, config, hovered: true })
    ).toHaveLength(1);

    const selectedConfig = setItemStyle(
      createDisplayConfig(USER),
      "value:value-1",
      "value",
      { trigger: "selected" },
      USER
    );
    expect(
      computeDisplayLayout({
        ...baseOptions,
        sources,
        config: selectedConfig,
        hovered: true,
      })
    ).toHaveLength(0);
    expect(
      computeDisplayLayout({
        ...baseOptions,
        sources,
        config: selectedConfig,
        selected: true,
      })
    ).toHaveLength(1);
  });

  it("属性条默认贴在指示物内侧底部并居中", () => {
    const items = computeDisplayLayout({
      ...baseOptions,
      sources: collectDisplaySources(
        { statuses: [], attributes: { bars: [makeBar()], values: [] } },
        { isMapOwner: true, isTokenOwner: true }
      ),
    });
    expect(items).toHaveLength(1);
    const bar = items[0];
    expect(bar.style).toBe("bar");
    expect(bar.x).toBeCloseTo(50);
    expect(bar.y).toBeLessThan(100);
    expect(bar.y).toBeGreaterThan(50);
  });

  it("颜色标记默认画在指示物内侧的同心环上", () => {
    const items = computeDisplayLayout({
      ...baseOptions,
      sources: collectDisplaySources(
        { statuses: ["red", "blue", "green"], attributes: { bars: [], values: [] } },
        { isMapOwner: true, isTokenOwner: true }
      ),
    });
    expect(items).toHaveLength(3);
    const [first, second, third] = items;
    expect(first.style).toBe("ring");
    expect(first.x).toBeCloseTo(50);
    expect(first.y).toBeCloseTo(50);
    expect(first.radius).toBeGreaterThan(second.radius);
    expect(second.radius).toBeGreaterThan(third.radius);
  });

  it("数值默认均匀分布在指示物外侧的环上", () => {
    const items = computeDisplayLayout({
      ...baseOptions,
      sources: collectDisplaySources(
        {
          statuses: [],
          attributes: {
            bars: [],
            values: [makeValue({ id: "a" }), makeValue({ id: "b" })],
          },
        },
        { isMapOwner: true, isTokenOwner: true }
      ),
    });
    expect(items).toHaveLength(2);
    const distances = items.map((item) =>
      Math.hypot(item.x - 50, item.y - 50)
    );
    distances.forEach((distance) => expect(distance).toBeGreaterThan(50));
    expect(items[0].y).not.toBeCloseTo(items[1].y);
  });

  it("order 决定同层排序", () => {
    let config = createDisplayConfig(USER);
    config = setItemStyle(config, "bar:a", "bar", { order: 5 }, USER);
    config = setItemStyle(config, "bar:b", "bar", { order: 1 }, USER);
    const sources = collectDisplaySources(
      {
        statuses: [],
        attributes: {
          bars: [makeBar({ id: "a" }), makeBar({ id: "b" })],
          values: [],
        },
      },
      { isMapOwner: true, isTokenOwner: true }
    );
    const items = computeDisplayLayout({ ...baseOptions, sources, config });
    expect(items[0].key).toBe("bar:b");
    // 底部内侧是从下往上叠：先排的更贴底
    expect(items[0].y).toBeGreaterThan(items[1].y);
  });
});
