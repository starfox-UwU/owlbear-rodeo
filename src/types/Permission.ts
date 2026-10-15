/**
 * 物件权限系统。
 *
 * 房主可以决定「哪些东西玩家能动」，以及「哪些东西只有特定玩家能动」。
 * 规则按等级描述，等级越高权限越大：
 *
 * ```
 * hidden  不可见（对该玩家完全不渲染）
 * view    只能看（不可移动、不可编辑）
 * move    可移动（可以拖动，但不能改名/删除/改数值）
 * edit    可完全编辑
 * ```
 *
 * 规则从「类别默认」向下级联到「单个物件」，用户级例外再覆盖玩家级默认：
 *
 * ```
 * 物件规则.特定玩家 > 物件规则.所有玩家
 *                  > 类别规则.特定玩家 > 类别规则.所有玩家
 * ```
 *
 * 任何一级都可以留空表示「跟随上一层」。
 */

/** 权限等级，数值越大权限越高（顺序由 `PERMISSION_LEVELS` 保证） */
export const PERMISSION_LEVELS = ["hidden", "view", "move", "edit"] as const;
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

/**
 * 「所有玩家」这一层可以取的取值。
 * 比单个玩家多一个 `owner`：物件所有者拿到 `edit`，其他人只能看。
 * 这是旧版本（没有权限系统时）的默认行为。
 */
export const EVERYONE_PERMISSIONS = [...PERMISSION_LEVELS, "owner"] as const;
export type EveryonePermission = (typeof EVERYONE_PERMISSIONS)[number];

/** 权限作用的物件类别 */
export const PERMISSION_TARGETS = ["tokens", "notes", "drawings"] as const;
export type PermissionTarget = (typeof PERMISSION_TARGETS)[number];

export type PermissionRule = {
  /** 留空表示跟随上层规则 */
  everyone?: EveryonePermission;
  /** 针对特定玩家的覆盖，key 是稳定的 `userId`。留空项跟随 `everyone` */
  users?: Record<string, PermissionLevel>;
};

export type PermissionState = {
  /** 按类别设置的默认规则 */
  defaults: Partial<Record<PermissionTarget, PermissionRule>>;
  /** 单个物件的覆盖规则，key 是物件 id（tokenState.id / note.id / drawing.id） */
  items: Record<string, PermissionRule>;
};
