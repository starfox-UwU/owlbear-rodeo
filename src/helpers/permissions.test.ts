import { describe, expect, it } from "vitest";

import {
  clearPermissionRulesForItems,
  createDefaultPermissionState,
  filterChangesByPermission,
  hasItemPermissionRule,
  isEveryonePermission,
  isPermissionLevel,
  legacyEveryonePermission,
  normalizePermissionState,
  permissionAllows,
  pickPositionOnlyChanges,
  resolvePermissionLevel,
  resolvePermissionRule,
  setPermissionRule,
  setPermissionRuleForItems,
} from "./permissions";
import { PermissionState } from "../types/Permission";
import { EditFlag } from "../types/MapState";

describe("legacyEveryonePermission", () => {
  it("把旧版 editFlags 映射成等价等级", () => {
    expect(legacyEveryonePermission("tokens", [])).toBe("owner");
    expect(legacyEveryonePermission("tokens", ["tokens"])).toBe("edit");
    expect(legacyEveryonePermission("notes", [])).toBe("view");
    expect(legacyEveryonePermission("notes", ["notes"])).toBe("edit");
    expect(legacyEveryonePermission("drawings", [])).toBe("view");
    expect(legacyEveryonePermission("drawings", ["drawing"])).toBe("edit");
  });

  it("fog 开关不影响物件权限", () => {
    expect(legacyEveryonePermission("tokens", ["fog"])).toBe("owner");
    expect(legacyEveryonePermission("notes", ["fog"])).toBe("view");
  });
});

describe("createDefaultPermissionState", () => {
  it("为三个类别都生成规则", () => {
    const state = createDefaultPermissionState(["tokens", "notes", "drawing"]);
    expect(state.defaults.tokens?.everyone).toBe("edit");
    expect(state.defaults.notes?.everyone).toBe("edit");
    expect(state.defaults.drawings?.everyone).toBe("edit");
    expect(state.items).toEqual({});
  });
});

describe("normalizePermissionState", () => {
  const flags: EditFlag[] = ["tokens"];

  it("没有数据时回退到 editFlags 推导的默认规则", () => {
    const state = normalizePermissionState(undefined, flags);
    expect(state.defaults.tokens?.everyone).toBe("edit");
    expect(state.defaults.notes?.everyone).toBe("view");
    expect(state.defaults.drawings?.everyone).toBe("view");
  });

  it("丢弃非法等级并保留合法值", () => {
    const state = normalizePermissionState(
      {
        defaults: { notes: { everyone: "nope" as any } },
        items: {
          a: { everyone: "move", users: { u1: "edit", u2: "bad" as any } },
        },
      },
      flags
    );
    // 非法 everyone 回退到默认
    expect(state.defaults.notes?.everyone).toBe("view");
    expect(state.items.a).toEqual({ everyone: "move", users: { u1: "edit" } });
  });

  it("丢掉没有任何内容的物件规则", () => {
    const state = normalizePermissionState(
      { defaults: {}, items: { a: { users: {} }, b: { users: { u: "view" } } } },
      flags
    );
    expect(state.items.a).toBeUndefined();
    expect(state.items.b).toEqual({ everyone: undefined, users: { u: "view" } });
  });

  it("容忍 null / 非对象输入", () => {
    expect(normalizePermissionState(null, []).defaults.tokens?.everyone).toBe(
      "owner"
    );
    expect(
      normalizePermissionState("oops" as any, []).defaults.notes?.everyone
    ).toBe("view");
  });
});

describe("resolvePermissionLevel", () => {
  const base = (): PermissionState => ({
    defaults: {
      tokens: { everyone: "view", users: {} },
      notes: { everyone: "view", users: {} },
      drawings: { everyone: "view", users: {} },
    },
    items: {},
  });

  it("没有覆盖时返回类别默认", () => {
    const state = base();
    expect(resolvePermissionLevel(state, "tokens", "t1", { userId: "u1" })).toBe(
      "view"
    );
  });

  it("物件规则覆盖类别默认", () => {
    const state = setPermissionRule(base(), "tokens", "t1", {
      everyone: "move",
    });
    expect(resolvePermissionLevel(state, "tokens", "t1", { userId: "u1" })).toBe(
      "move"
    );
    expect(resolvePermissionLevel(state, "tokens", "t2", { userId: "u1" })).toBe(
      "view"
    );
  });

  it("特定玩家例外优先于物件和类别的 everyone", () => {
    let state = setPermissionRule(base(), "tokens", null, {
      users: { u1: "edit" },
    });
    state = setPermissionRule(state, "tokens", "t1", { everyone: "hidden" });
    expect(resolvePermissionLevel(state, "tokens", "t1", { userId: "u1" })).toBe(
      "edit"
    );
    expect(resolvePermissionLevel(state, "tokens", "t1", { userId: "u2" })).toBe(
      "hidden"
    );
  });

  it("物件级玩家例外优先于类别级玩家例外", () => {
    let state = setPermissionRule(base(), "notes", null, {
      users: { u1: "move" },
    });
    state = setPermissionRule(state, "notes", "n1", { users: { u1: "hidden" } });
    expect(resolvePermissionLevel(state, "notes", "n1", { userId: "u1" })).toBe(
      "hidden"
    );
    expect(resolvePermissionLevel(state, "notes", "n2", { userId: "u1" })).toBe(
      "move"
    );
  });

  it("everyone 为 owner 时按物件所有者判定", () => {
    const state = setPermissionRule(base(), "tokens", "t1", {
      everyone: "owner",
    });
    expect(
      resolvePermissionLevel(state, "tokens", "t1", {
        userId: "u1",
        itemOwnerId: "u1",
      })
    ).toBe("edit");
    expect(
      resolvePermissionLevel(state, "tokens", "t1", {
        userId: "u2",
        itemOwnerId: "u1",
      })
    ).toBe("view");
  });

  it("没有 userId（身份未就绪）时不套用玩家例外", () => {
    const state = setPermissionRule(base(), "tokens", "t1", {
      everyone: "hidden",
      users: { u1: "edit" },
    });
    expect(resolvePermissionLevel(state, "tokens", "t1", {})).toBe("hidden");
    expect(resolvePermissionLevel(state, "tokens", "t1", { userId: "u1" })).toBe(
      "edit"
    );
  });

  it("everyone 为 owner 且没有 userId 时退化为只能看", () => {
    const state = setPermissionRule(base(), "tokens", "t1", {
      everyone: "owner",
    });
    expect(resolvePermissionLevel(state, "tokens", "t1", {})).toBe("view");
  });
});

describe("resolvePermissionRule", () => {
  it("合并类别与物件的玩家例外，物件优先", () => {
    let state = createDefaultPermissionState([]);
    state = setPermissionRule(state, "drawings", null, {
      everyone: "view",
      users: { u1: "move", u2: "edit" },
    });
    state = setPermissionRule(state, "drawings", "d1", {
      users: { u2: "hidden" },
    });
    const rule = resolvePermissionRule(state, "drawings", "d1");
    expect(rule.everyone).toBe("view");
    expect(rule.users).toEqual({ u1: "move", u2: "hidden" });
  });

  it("物件未设置 everyone 时沿用类别默认", () => {
    let state = createDefaultPermissionState(["drawing"]);
    state = setPermissionRule(state, "drawings", "d1", { users: { u1: "move" } });
    expect(resolvePermissionRule(state, "drawings", "d1").everyone).toBe("edit");
  });
});

describe("permissionAllows", () => {
  it("按等级排序比较", () => {
    expect(permissionAllows("edit", "move")).toBe(true);
    expect(permissionAllows("move", "move")).toBe(true);
    expect(permissionAllows("view", "move")).toBe(false);
    expect(permissionAllows("hidden", "view")).toBe(false);
    expect(permissionAllows("edit", "hidden")).toBe(true);
  });
});

describe("setPermissionRule", () => {
  const empty = createDefaultPermissionState([]);

  it("不修改入参", () => {
    const before = JSON.stringify(empty);
    setPermissionRule(empty, "tokens", "t1", { everyone: "move" });
    expect(JSON.stringify(empty)).toBe(before);
  });

  it("everyone 传 null 表示清除，回到跟随上层", () => {
    let state = setPermissionRule(empty, "tokens", "t1", { everyone: "move" });
    expect(hasItemPermissionRule(state, "t1")).toBe(true);
    state = setPermissionRule(state, "tokens", "t1", { everyone: null });
    expect(hasItemPermissionRule(state, "t1")).toBe(false);
    expect(state.items.t1).toBeUndefined();
  });

  it("玩家例外传 null 表示删除该例外", () => {
    let state = setPermissionRule(empty, "notes", "n1", {
      users: { u1: "edit", u2: "move" },
    });
    state = setPermissionRule(state, "notes", "n1", { users: { u1: null } });
    expect(state.items.n1?.users).toEqual({ u2: "move" });
  });

  it("itemId 为 null 时写类别默认", () => {
    const state = setPermissionRule(empty, "notes", null, { everyone: "hidden" });
    expect(state.defaults.notes?.everyone).toBe("hidden");
    expect(state.items).toEqual({});
  });

  it("批量设置把规则写到每个物件", () => {
    const state = setPermissionRuleForItems(empty, "tokens", ["a", "b"], {
      everyone: "move",
      users: { u1: "edit" },
    });
    expect(state.items.a?.everyone).toBe("move");
    expect(state.items.b?.everyone).toBe("move");
    expect(state.items.b?.users).toEqual({ u1: "edit" });
  });

  it("批量清除只删掉存在的规则", () => {
    let state = setPermissionRuleForItems(empty, "tokens", ["a", "b"], {
      everyone: "move",
    });
    state = clearPermissionRulesForItems(state, ["a", "zzz"]);
    expect(state.items.a).toBeUndefined();
    expect(state.items.b?.everyone).toBe("move");
  });
});

describe("类型守卫", () => {
  it("isPermissionLevel 只接受四个等级", () => {
    expect(isPermissionLevel("edit")).toBe(true);
    expect(isPermissionLevel("owner")).toBe(false);
    expect(isPermissionLevel(1)).toBe(false);
  });

  it("isEveryonePermission 额外接受 owner", () => {
    expect(isEveryonePermission("owner")).toBe(true);
    expect(isEveryonePermission("hidden")).toBe(true);
    expect(isEveryonePermission("nope")).toBe(false);
  });
});

describe("pickPositionOnlyChanges", () => {
  it("只保留拖动会改到的字段", () => {
    expect(
      pickPositionOnlyChanges({
        x: 1,
        y: 2,
        lastModified: 3,
        lastModifiedBy: "u1",
        label: "改名",
        size: 2,
        locked: true,
      })
    ).toEqual({ x: 1, y: 2, lastModified: 3, lastModifiedBy: "u1" });
  });

  it("没有任何位置字段时返回空对象", () => {
    expect(pickPositionOnlyChanges({ label: "只改名" })).toEqual({});
  });

  it("值为 0 的位置也要保留（不能被当成缺失）", () => {
    expect(pickPositionOnlyChanges({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe("filterChangesByPermission", () => {
  const levels: Record<string, "hidden" | "view" | "move" | "edit"> = {
    a: "edit",
    b: "move",
    c: "view",
    d: "hidden",
  };
  const resolve = (id: string) => levels[id] ?? "view";

  it("edit 原样通过、move 只留位置、view/hidden 整条丢弃", () => {
    const result = filterChangesByPermission(
      {
        a: { label: "改名", x: 1 },
        b: { label: "改名", x: 2, y: 3 },
        c: { x: 4 },
        d: { x: 5 },
      },
      resolve
    );

    expect(result.a).toEqual({ label: "改名", x: 1 });
    expect(result.b).toEqual({ x: 2, y: 3 });
    expect(result.c).toBeUndefined();
    expect(result.d).toBeUndefined();
  });

  it("move 等级只改非位置字段时整条丢弃", () => {
    const result = filterChangesByPermission({ b: { label: "改名" } }, resolve);
    expect(result).toEqual({});
  });

  it("跳过空值项，不产生多余键", () => {
    const result = filterChangesByPermission<{ x: number }>(
      { a: undefined, b: { x: 1 } },
      resolve
    );
    expect(Object.keys(result)).toEqual(["b"]);
  });

  it("描述的是权限等级，不是物件身份", () => {
    // resolve 决定等级，等级决定能改什么
    const result = filterChangesByPermission(
      { unknown: { x: 9, label: "x" } },
      () => "move"
    );
    expect(result.unknown).toEqual({ x: 9 });
  });
});
