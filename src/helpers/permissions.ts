import { EditFlag } from "../types/MapState";
import {
  EVERYONE_PERMISSIONS,
  PERMISSION_LEVELS,
  PERMISSION_TARGETS,
  EveryonePermission,
  PermissionLevel,
  PermissionRule,
  PermissionState,
  PermissionTarget,
} from "../types/Permission";

/** 等级排序，用于「至少需要某个等级」的判断 */
export const PERMISSION_RANK: Record<PermissionLevel, number> = {
  hidden: 0,
  view: 1,
  move: 2,
  edit: 3,
};

export function isPermissionLevel(value: unknown): value is PermissionLevel {
  return (
    typeof value === "string" &&
    (PERMISSION_LEVELS as readonly string[]).includes(value)
  );
}

export function isEveryonePermission(
  value: unknown
): value is EveryonePermission {
  return (
    typeof value === "string" &&
    (EVERYONE_PERMISSIONS as readonly string[]).includes(value)
  );
}

export function isPermissionTarget(value: unknown): value is PermissionTarget {
  return (
    typeof value === "string" &&
    (PERMISSION_TARGETS as readonly string[]).includes(value)
  );
}

/**
 * 没有自定义权限时，旧版 `editFlags` 等价于哪个等级。
 *
 * - 指示物：允许其他人编辑 → `edit`；否则只有物主能编辑 → `owner`
 *   （旧版行为正是「没开开关时玩家仍能摆自己的指示物」）
 * - 笔记：允许编辑 → `edit`；否则玩家只能看
 * - 绘制物：允许绘制 → `edit`；否则玩家只能看
 */
export function legacyEveryonePermission(
  target: PermissionTarget,
  editFlags: readonly EditFlag[] = []
): EveryonePermission {
  switch (target) {
    case "tokens":
      return editFlags.includes("tokens") ? "edit" : "owner";
    case "notes":
      return editFlags.includes("notes") ? "edit" : "view";
    case "drawings":
      return editFlags.includes("drawing") ? "edit" : "view";
    default:
      return "view";
  }
}

/** 依据旧版 editFlags 生成一份等价的全新权限状态 */
export function createDefaultPermissionState(
  editFlags: readonly EditFlag[] = []
): PermissionState {
  const defaults: PermissionState["defaults"] = {};
  for (const target of PERMISSION_TARGETS) {
    defaults[target] = {
      everyone: legacyEveryonePermission(target, editFlags),
      users: {},
    };
  }
  return { defaults, items: {} };
}

function sanitizeUsers(input: unknown): Record<string, PermissionLevel> {
  const result: Record<string, PermissionLevel> = {};
  if (!input || typeof input !== "object") {
    return result;
  }
  for (const [id, level] of Object.entries(input as Record<string, unknown>)) {
    if (id && isPermissionLevel(level)) {
      result[id] = level;
    }
  }
  return result;
}

/**
 * 把任意来源（网络 / 旧存档 / 手改）的权限数据整理成可安全使用的状态。
 * 缺失或非法的字段一律回退到 `editFlags` 推导出的默认规则。
 */
export function normalizePermissionState(
  input: PermissionState | undefined | null,
  editFlags: readonly EditFlag[] = []
): PermissionState {
  const base = createDefaultPermissionState(editFlags);
  if (!input || typeof input !== "object") {
    return base;
  }

  const defaults: PermissionState["defaults"] = {};
  for (const target of PERMISSION_TARGETS) {
    const raw = input.defaults?.[target];
    const fallback = base.defaults[target];
    defaults[target] = {
      everyone: isEveryonePermission(raw?.everyone)
        ? raw!.everyone
        : fallback?.everyone,
      users: sanitizeUsers(raw?.users),
    };
  }

  const items: Record<string, PermissionRule> = {};
  if (input.items && typeof input.items === "object") {
    for (const [id, raw] of Object.entries(input.items)) {
      if (!id || !raw || typeof raw !== "object") {
        continue;
      }
      const users = sanitizeUsers(raw.users);
      const rule: PermissionRule = { users };
      if (isEveryonePermission(raw.everyone)) {
        rule.everyone = raw.everyone;
      }
      if (rule.everyone === undefined && Object.keys(users).length === 0) {
        continue;
      }
      items[id] = rule;
    }
  }

  return { defaults, items };
}

/** 把 `owner` 这个特殊取值解析成实际等级 */
function everyoneToLevel(
  value: EveryonePermission,
  userId?: string,
  itemOwnerId?: string
): PermissionLevel {
  if (value === "owner") {
    return itemOwnerId && userId && itemOwnerId === userId ? "edit" : "view";
  }
  return value;
}

/**
 * 把「类别默认 + 物件覆盖」合并成一条最终规则。
 * 物件的字段优先，未设置的字段继续沿用类别默认。
 */
export function resolvePermissionRule(
  state: PermissionState,
  target: PermissionTarget,
  itemId?: string
): PermissionRule {
  const item = itemId ? state.items[itemId] : undefined;
  const fallback = state.defaults[target];
  return {
    everyone: item?.everyone ?? fallback?.everyone,
    users: { ...(fallback?.users ?? {}), ...(item?.users ?? {}) },
  };
}

export type PermissionContext = {
  userId?: string;
  /**
   * 物件的所有者（token.owner / note.ownerId）。
   * 只有规则里用到 `owner` 时才需要。
   */
  itemOwnerId?: string;
};

/** 求出某个玩家对某个物件实际拥有的等级 */
export function resolvePermissionLevel(
  state: PermissionState,
  target: PermissionTarget,
  itemId: string | undefined,
  context: PermissionContext = {}
): PermissionLevel {
  const rule = resolvePermissionRule(state, target, itemId);
  const specific = context.userId ? rule.users?.[context.userId] : undefined;
  if (specific) {
    return specific;
  }
  return everyoneToLevel(
    rule.everyone ?? "view",
    context.userId,
    context.itemOwnerId
  );
}

/** `level` 是否至少达到 `required` */
export function permissionAllows(
  level: PermissionLevel,
  required: PermissionLevel
): boolean {
  return PERMISSION_RANK[level] >= PERMISSION_RANK[required];
}

/** 一条规则是否什么都没设置（用于判断能否直接删除） */
export function isEmptyPermissionRule(rule: PermissionRule | undefined): boolean {
  if (!rule) {
    return true;
  }
  return (
    rule.everyone === undefined &&
    Object.keys(rule.users ?? {}).length === 0
  );
}

/**
 * 「移动」等级允许改动的字段。
 *
 * 拖动的本质就是改这几个值，其余（改名、数值、大小、可见性……）都算编辑。
 */
export const POSITION_ONLY_KEYS = [
  "x",
  "y",
  "lastModified",
  "lastModifiedBy",
] as const;

export function pickPositionOnlyChanges<T extends Record<string, any>>(
  change: T
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of POSITION_ONLY_KEYS) {
    if (change[key] !== undefined) {
      result[key as keyof T] = change[key];
    }
  }
  return result;
}

/**
 * 按权限过滤一批物件改动，是所有改动落地前的最后一道闸门：
 *
 * - `edit` 等级 → 原样通过
 * - `move` 等级 → 只留下位置相关字段
 * - 其他等级 → 整条丢弃
 *
 * 这样即使某个交互路径忘了单独判权，也不会把「可移动」变成「可编辑」。
 */
export function filterChangesByPermission<T extends Record<string, any>>(
  changes: Record<string, T | undefined>,
  resolveLevel: (itemId: string, change: T) => PermissionLevel
): Record<string, Partial<T>> {
  const allowed: Record<string, Partial<T>> = {};
  for (const [id, change] of Object.entries(changes)) {
    if (!change) {
      continue;
    }
    const level = resolveLevel(id, change);
    if (permissionAllows(level, "edit")) {
      allowed[id] = change;
    } else if (permissionAllows(level, "move")) {
      const positionOnly = pickPositionOnlyChanges(change);
      if (Object.keys(positionOnly).length > 0) {
        allowed[id] = positionOnly;
      }
    }
  }
  return allowed;
}

export type PermissionRulePatch = {
  /** `null` 表示清除，回到「跟随上层」 */
  everyone?: EveryonePermission | null;
  /** 值为 `null` 表示清除该玩家的例外 */
  users?: Record<string, PermissionLevel | null>;
};

function applyRulePatch(
  rule: PermissionRule | undefined,
  patch: PermissionRulePatch
): PermissionRule | undefined {
  const next: PermissionRule = {
    everyone: rule?.everyone,
    users: { ...(rule?.users ?? {}) },
  };

  if (patch.everyone !== undefined) {
    if (patch.everyone === null) {
      delete next.everyone;
    } else {
      next.everyone = patch.everyone;
    }
  }

  if (patch.users) {
    for (const [id, level] of Object.entries(patch.users)) {
      if (level === null) {
        delete next.users![id];
      } else {
        next.users![id] = level;
      }
    }
  }

  return isEmptyPermissionRule(next) ? undefined : next;
}

/**
 * 写入一条规则并返回新的权限状态（不修改入参）。
 *
 * `itemId` 为 `null` 表示写类别默认规则，否则写该物件的覆盖规则。
 */
export function setPermissionRule(
  state: PermissionState,
  target: PermissionTarget,
  itemId: string | null,
  patch: PermissionRulePatch
): PermissionState {
  if (itemId) {
    const nextRule = applyRulePatch(state.items[itemId], patch);
    const items = { ...state.items };
    if (nextRule) {
      items[itemId] = nextRule;
    } else {
      delete items[itemId];
    }
    return { ...state, items };
  }

  const nextRule = applyRulePatch(state.defaults[target], patch);
  return {
    ...state,
    defaults: {
      ...state.defaults,
      [target]: nextRule ?? {},
    },
  };
}

/** 把同一条规则一次性写到多个物件上（框选批量授权用） */
export function setPermissionRuleForItems(
  state: PermissionState,
  target: PermissionTarget,
  itemIds: readonly string[],
  patch: PermissionRulePatch
): PermissionState {
  return itemIds.reduce(
    (current, id) => setPermissionRule(current, target, id, patch),
    state
  );
}

/** 清掉这些物件的覆盖规则，让它们回到类别默认 */
export function clearPermissionRulesForItems(
  state: PermissionState,
  itemIds: readonly string[]
): PermissionState {
  const items = { ...state.items };
  let changed = false;
  for (const id of itemIds) {
    if (id in items) {
      delete items[id];
      changed = true;
    }
  }
  return changed ? { ...state, items } : state;
}

/** 某个物件是否设了覆盖规则 */
export function hasItemPermissionRule(
  state: PermissionState,
  itemId: string
): boolean {
  return !isEmptyPermissionRule(state.items[itemId]);
}

/**
 * 接收方能不能把这次权限改动当成「已有对象的字段修改」来落地。
 *
 * `applyChanges` 会跳过「路径还不存在」的 `E`（编辑）变更，
 * 用来防止增量更新落到还没同步到的物件上。副作用是：
 * 一个字段**从无到有**时，这次改动会在服务端和其它客户端被静默丢掉。
 *
 * 所以地图上第一次设置权限时必须改走整份 `map_state` 全量同步，
 * 让 `permissions` 先在所有端存在，之后的增量修改才落得下去。
 */
export function canApplyPermissionDiff(
  permissions: PermissionState | undefined | null
): boolean {
  return !!permissions && typeof permissions === "object" && !!permissions.defaults;
}

/**
 * 权限状态的内容指纹。
 *
 * 增量同步是「浅拷贝 mapState + 就地改嵌套对象」，
 * 所以 `permissions` 的**引用可能不变**。判断是否需要重新计算权限，
 * 必须看内容而不是引用，否则玩家的权限要刷新页面才会生效。
 */
export function permissionStateKey(
  permissions: PermissionState | undefined | null
): string {
  if (permissions === undefined || permissions === null) {
    return "";
  }
  return JSON.stringify(permissions);
}
