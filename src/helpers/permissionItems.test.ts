import { describe, expect, it } from "vitest";

import { collectPermissionItems } from "./permissionItems";

import { MapState } from "../types/MapState";
import { createDefaultPermissionState } from "./permissions";

/** 只做插值的翻译桩，方便断言而不依赖语言包 */
const t = (_key: string, values?: Record<string, string | number>) =>
  values ? `${_key}:${JSON.stringify(values)}` : _key;

function buildMapState(): MapState {
  return {
    mapId: "map-1",
    editFlags: [],
    tokens: {
      tokenA: {
        id: "tokenA",
        tokenId: "tokenA",
        owner: "u1",
        size: 1,
        category: "character",
        label: "哥布林",
        statuses: [],
        x: 0,
        y: 0,
        lastModifiedBy: "u1",
        lastModified: 300,
        rotation: 0,
        locked: false,
        visible: true,
        outline: { type: "solid", color: "white" } as any,
        width: 1,
        height: 1,
        type: "default",
        key: "goblin",
      },
      tokenB: {
        id: "tokenB",
        tokenId: "tokenB",
        owner: "u2",
        size: 1,
        category: "prop",
        label: "",
        statuses: [],
        x: 0,
        y: 0,
        lastModifiedBy: "u2",
        lastModified: 100,
        rotation: 0,
        locked: false,
        visible: true,
        outline: { type: "solid", color: "white" } as any,
        width: 1,
        height: 1,
        type: "default",
        key: "rock",
      },
    },
    notes: {
      noteA: {
        id: "noteA",
        color: "white",
        lastModified: 200,
        lastModifiedBy: "u1",
        locked: false,
        size: 1,
        text: "  这是   一段很长的笔记内容，用来测试标题截断逻辑是否真的生效了，这里再补一句让总长度超过四十个字符  ",
        textOnly: false,
        visible: true,
        ownerId: "u1",
        x: 0,
        y: 0,
        rotation: 0,
      },
    },
    drawings: {
      drawA: {
        id: "drawA",
        type: "path",
        pathType: "stroke",
        blend: false,
        color: "red",
        strokeWidth: 1,
        data: { points: [] },
      },
    },
    fogs: {},
    tokenNotes: {},
    templates: {},
    permissions: createDefaultPermissionState([]),
  } as unknown as MapState;
}

describe("collectPermissionItems", () => {
  const mapState = buildMapState();

  it("按最近修改倒序列出指示物，并带出物主", () => {
    const items = collectPermissionItems(mapState, "tokens", t as any);
    expect(items.map((item) => item.id)).toEqual(["tokenA", "tokenB"]);
    expect(items[0].label).toBe("哥布林");
    expect(items[0].ownerId).toBe("u1");
    // 没名字的指示物用兜底文案
    expect(items[1].label).toBe("permissions.unnamedToken");
  });

  it("笔记用正文首行做标题并截断", () => {
    const items = collectPermissionItems(mapState, "notes", t as any);
    expect(items).toHaveLength(1);
    expect(items[0].ownerId).toBe("u1");
    expect(items[0].label.endsWith("…")).toBe(true);
    expect(items[0].label.startsWith("这是 一段很长")).toBe(true);
    expect(items[0].label.length).toBeLessThanOrEqual(41);
  });

  it("绘制物没有名字，用形状类型生成", () => {
    const items = collectPermissionItems(mapState, "drawings", t as any);
    expect(items).toHaveLength(1);
    expect(items[0].label).toContain("permissions.unnamedDrawing");
    expect(items[0].label).toContain("stroke");
  });

  it("没有地图状态时返回空列表", () => {
    expect(collectPermissionItems(null, "tokens", t as any)).toEqual([]);
  });

  it("缺少某个类别时不报错", () => {
    const empty = { ...mapState, tokens: {} } as MapState;
    expect(collectPermissionItems(empty, "tokens", t as any)).toEqual([]);
  });
});
