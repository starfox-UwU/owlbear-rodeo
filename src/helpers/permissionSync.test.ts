import { describe, expect, it } from "vitest";

import { applyChanges, diff } from "./diff";
import {
  canApplyPermissionDiff,
  createDefaultPermissionState,
  normalizePermissionState,
  permissionStateKey,
  resolvePermissionLevel,
  setPermissionRule,
} from "./permissions";
import { EditFlag } from "../types/MapState";
import { PermissionState } from "../types/Permission";

/**
 * 回归测试：房主改了权限之后，另一边必须**立刻**生效，不能靠刷新页面。
 *
 * 真实事故的成因有两处：
 *
 * 1. 收到 `map_state_update` 时是「浅拷贝 mapState + 就地改嵌套对象」，
 *    `permissions` 的引用保持不变。如果权限是用引用做记忆键去推导的，
 *    玩家端就会一直沿用旧结论 —— 这就是「必须刷新才生效」的直接原因。
 *    修法：用内容指纹 `permissionStateKey` 判断是否需要重算。
 *
 * 2. `applyChanges` 会跳过「路径不存在」的 `E`（编辑）变更。
 *    只要 `permissions` 还有可能从「没有」变成「有」，这次改动就会被静默丢掉。
 *    修法：这种时候改走整份 `map_state` 全量同步（`canApplyPermissionDiff`）。
 */
type FakeMapState = {
  mapId: string;
  editFlags: EditFlag[];
  tokens: Record<string, { id: string; owner: string; x: number; y: number }>;
  permissions?: PermissionState;
};

const EDIT_FLAGS: EditFlag[] = ["drawing", "tokens", "notes"];

function buildMapState(): FakeMapState {
  return {
    mapId: "map-1",
    // 旧版开关默认允许玩家编辑指示物
    editFlags: [...EDIT_FLAGS],
    tokens: { t1: { id: "t1", owner: "gm", x: 0, y: 0 } },
  };
}

/** 玩家端的权限结论（和 PermissionsProvider 里的算法一致） */
function playerLevel(state: FakeMapState, userId: string) {
  const permissions = normalizePermissionState(
    state.permissions,
    state.editFlags
  );
  return resolvePermissionLevel(permissions, "tokens", "t1", { userId });
}

describe("权限改动的增量同步", () => {
  it("字段缺失时 deep-diff 报的是 N，可以正常落地", () => {
    const before = buildMapState();
    const after: FakeMapState = {
      ...before,
      permissions: setPermissionRule(
        createDefaultPermissionState(EDIT_FLAGS),
        "tokens",
        null,
        { everyone: "view" }
      ),
    };

    const changes = diff(before, after)!;
    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe("N");

    const receiver: FakeMapState = { ...before };
    applyChanges(receiver, changes as any);
    expect(playerLevel(receiver, "player-1")).toBe("view");
  });

  it("字段存在但为空时 deep-diff 报 E，接收端没有该路径就会被静默丢掉", () => {
    // 例：msgpack 把 undefined 编成 null 后传到对端
    const before: FakeMapState = {
      ...buildMapState(),
      permissions: undefined,
    };
    const after: FakeMapState = {
      ...buildMapState(),
      permissions: createDefaultPermissionState(EDIT_FLAGS),
    };

    const changes = diff(before, after)!;
    expect(changes[0].kind).toBe("E");
    expect((changes[0] as any).path).toEqual(["permissions"]);

    // 接收端连 permissions 这个键都没有 → get(target, path) === undefined → 丢弃
    const receiver: FakeMapState = buildMapState();
    applyChanges(receiver, changes as any);
    expect(receiver.permissions).toBeUndefined();
    // 玩家仍是旧行为（可以编辑）—— 正是「改了权限不生效」的表现
    expect(playerLevel(receiver, "player-1")).toBe("edit");

    // 所以这种情况下必须走全量同步
    expect(canApplyPermissionDiff(before.permissions)).toBe(false);
    expect(canApplyPermissionDiff(after.permissions)).toBe(true);
  });

  it("权限已存在时，嵌套改动会就地修改（引用不变）但内容会变", () => {
    const base: FakeMapState = {
      ...buildMapState(),
      permissions: createDefaultPermissionState(EDIT_FLAGS),
    };
    const next: FakeMapState = {
      ...base,
      permissions: setPermissionRule(base.permissions!, "tokens", null, {
        everyone: "view",
      }),
    };

    const changes = diff(base, next)!;
    expect(changes[0].kind).toBe("E");
    // 深层路径：接收端找得到，所以这次会正常落地
    expect((changes[0] as any).path).toEqual([
      "permissions",
      "defaults",
      "tokens",
      "everyone",
    ]);

    const receiver: FakeMapState = { ...base };
    const keyBefore = permissionStateKey(receiver.permissions);
    applyChanges(receiver, changes as any);

    // 内容确实更新了
    expect(playerLevel(receiver, "player-1")).toBe("view");
    expect(canApplyPermissionDiff(receiver.permissions)).toBe(true);

    // ⚠️ 但引用没变 —— 只看引用的话权限推导不会重算，玩家要刷新才生效
    expect(receiver.permissions).toBe(base.permissions);
    // 内容指纹能发现变化，所以用它做记忆键就能立刻生效
    expect(permissionStateKey(receiver.permissions)).not.toBe(keyBefore);
  });

  it("内容指纹对相同内容稳定，对空值返回空串", () => {
    const a = createDefaultPermissionState(EDIT_FLAGS);
    const b = createDefaultPermissionState(EDIT_FLAGS);
    expect(permissionStateKey(a)).toBe(permissionStateKey(b));
    expect(permissionStateKey(undefined)).toBe("");
    expect(permissionStateKey(null)).toBe("");

    const changed = setPermissionRule(a, "notes", null, { everyone: "hidden" });
    expect(permissionStateKey(changed)).not.toBe(permissionStateKey(a));
  });

  it("canApplyPermissionDiff 只在字段完整存在时才为真", () => {
    expect(canApplyPermissionDiff(undefined)).toBe(false);
    expect(canApplyPermissionDiff(null)).toBe(false);
    expect(canApplyPermissionDiff({} as PermissionState)).toBe(false);
    expect(canApplyPermissionDiff({ defaults: {}, items: {} })).toBe(true);
  });
});
