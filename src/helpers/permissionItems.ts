import { getNoteContent } from "./notes";

import { MapState } from "../types/MapState";
import { PermissionTarget } from "../types/Permission";

export type PermissionItem = {
  id: string;
  label: string;
  /** 物件所有者，用于解析规则里的 `owner` 取值 */
  ownerId?: string;
};

type Translate = (
  key: any,
  values?: Record<string, string | number>
) => string;

function sortByTime<T>(items: T[], getModified: (item: T) => number): T[] {
  return [...items].sort((a, b) => getModified(b) - getModified(a));
}

/**
 * 把地图上某一类物件整理成权限面板可以直接展示 / 授权的列表。
 *
 * 放在 helpers 里而不是组件里，是因为它不依赖任何 React context，
 * 可以直接做单元测试。
 */
export function collectPermissionItems(
  mapState: MapState | null,
  target: PermissionTarget,
  t: Translate
): PermissionItem[] {
  if (!mapState) {
    return [];
  }

  switch (target) {
    case "tokens":
      return sortByTime(
        Object.values(mapState.tokens ?? {}),
        (tokenState) => tokenState.lastModified ?? 0
      ).map((tokenState) => ({
        id: tokenState.id,
        label: tokenState.label || t("permissions.unnamedToken"),
        ownerId: tokenState.owner,
      }));
    case "notes":
      return sortByTime(
        Object.values(mapState.notes ?? {}),
        (note) => note.lastModified ?? 0
      ).map((note) => {
        const content = getNoteContent(note).replace(/\s+/g, " ").trim();
        return {
          id: note.id,
          label: content
            ? content.length > 40
              ? `${content.slice(0, 40)}…`
              : content
            : t("permissions.unnamedNote"),
          ownerId: note.ownerId,
        };
      });
    case "drawings":
      return Object.values(mapState.drawings ?? {}).map((drawing) => {
        const shapeType =
          drawing.type === "path" ? drawing.pathType : drawing.shapeType;
        return {
          id: drawing.id,
          label: t("permissions.unnamedDrawing", { type: shapeType }),
        };
      });
    default:
      return [];
  }
}
