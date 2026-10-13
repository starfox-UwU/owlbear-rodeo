import polygonClipping, { Geom, Ring } from "polygon-clipping";

/**
 * `polygon-clipping` 的扫描线算法对浮点近重合顶点非常敏感：当被裁剪的多边形
 * 与网格单元之间存在几乎共线/几乎重合的点时（六边形网格的斜边尤其容易出现），
 * 它会抛出
 *   `Unable to complete output ring starting at [...]. Last matching segment ...`
 * 并让整个渲染过程崩溃。
 *
 * 这里通过三步保证稳健：
 * 1. 清理输入（去掉重复点、共线点与退化环）；
 * 2. 如果裁剪失败，则逐级提高坐标量化精度后重试，消除近重合顶点；
 * 3. 仍然失败时返回 `null`，由调用方退回到纯几何判定。
 */
export const CLIP_QUANTIZATION_STEPS = [0, 1e-6, 1e-5, 1e-4, 1e-3];

/** 判定两个点/三个点是否重合或共线时使用的绝对容差（像素） */
const POINT_TOLERANCE = 1e-9;

const EMPTY_GEOM: Geom = [];

type Point = { x: number; y: number };

/**
 * `Geom` 既可能是 `Polygon`（`Ring[]`）也可能是 `MultiPolygon`（`Ring[][]`），
 * 这里统一转换为 `Polygon[]`。
 */
export function toPolygons(geom: Geom | null | undefined): Ring[][] {
  if (!geom || geom.length === 0) {
    return [];
  }
  const first = geom[0] as unknown as Ring[];
  if (typeof first?.[0]?.[0] === "number") {
    return [geom as unknown as Ring[]];
  }
  return (geom as unknown as Ring[][]).filter(
    (polygon) => Array.isArray(polygon) && polygon.length > 0
  );
}

function samePoint(a: [number, number], b: [number, number]): boolean {
  return (
    Math.abs(a[0] - b[0]) <= POINT_TOLERANCE &&
    Math.abs(a[1] - b[1]) <= POINT_TOLERANCE
  );
}

/**
 * 去除环中重复的（含首尾重复的）顶点与共线的中间顶点。
 * 顶点数少于三个（或退化为一条线）时返回空环。
 */
export function cleanRing(ring: Ring | undefined | null): Ring {
  if (!ring || ring.length < 3) {
    return [];
  }

  const deduped: [number, number][] = [];
  for (const point of ring) {
    if (typeof point?.[0] !== "number" || typeof point?.[1] !== "number") {
      continue;
    }
    if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
      continue;
    }
    const last = deduped[deduped.length - 1];
    if (last && samePoint(last, point as [number, number])) {
      continue;
    }
    deduped.push([point[0], point[1]]);
  }
  while (deduped.length > 1 && samePoint(deduped[0], deduped[deduped.length - 1])) {
    deduped.pop();
  }
  if (deduped.length < 3) {
    return [];
  }

  const cleaned: [number, number][] = [];
  for (let i = 0; i < deduped.length; i++) {
    const previous = deduped[(i - 1 + deduped.length) % deduped.length];
    const current = deduped[i];
    const next = deduped[(i + 1) % deduped.length];
    const cross =
      (current[0] - previous[0]) * (next[1] - previous[1]) -
      (current[1] - previous[1]) * (next[0] - previous[0]);
    const scale =
      Math.abs(current[0] - previous[0]) +
      Math.abs(current[1] - previous[1]) +
      Math.abs(next[0] - current[0]) +
      Math.abs(next[1] - current[1]);
    // 相对容差：只有当叉积相对于边长小到可以忽略时才认为是共线
    if (Math.abs(cross) <= 1e-12 * scale * scale) {
      continue;
    }
    cleaned.push(current);
  }

  return cleaned.length < 3 ? [] : cleaned;
}

/** 清理几何中的所有环，丢弃退化后的空环/空多边形 */
export function cleanGeom(geom: Geom | null | undefined): Geom {
  const polygons = toPolygons(geom)
    .map((polygon) =>
      polygon.map(cleanRing).filter((ring) => ring.length >= 3)
    )
    .filter((polygon) => polygon.length > 0);
  return polygons as unknown as Geom;
}

/** 按给定步长量化所有坐标，用于消除浮点近重合顶点 */
export function quantizeGeom(geom: Geom, step: number): Geom {
  if (step <= 0) {
    return geom;
  }
  const quantize = (value: number) => Math.round(value / step) * step;
  const polygons = toPolygons(geom).map((polygon) =>
    polygon.map((ring) =>
      ring.map(
        ([x, y]) => [quantize(x), quantize(y)] as [number, number]
      )
    )
  );
  return polygons as unknown as Geom;
}

/**
 * 求两个几何的交集，失败时返回 `null`（而不是抛出异常）。
 * 内部会先清理输入，再按 `CLIP_QUANTIZATION_STEPS` 逐级量化重试。
 */
export function safeIntersection(a: Geom, b: Geom): Geom | null {
  const left = cleanGeom(a);
  const right = cleanGeom(b);
  if (left.length === 0 || right.length === 0) {
    return EMPTY_GEOM;
  }
  for (const step of CLIP_QUANTIZATION_STEPS) {
    try {
      return polygonClipping.intersection(
        step > 0 ? quantizeGeom(left, step) : left,
        step > 0 ? quantizeGeom(right, step) : right
      ) as Geom;
    } catch {
      // 换一个量化精度重试
    }
  }
  return null;
}

/**
 * 合并几何，失败时返回未合并的多边形集合（重叠部分在填充时结果一致）。
 */
export function safeUnion(geoms: Geom[]): Geom {
  const cleaned = geoms.map(cleanGeom).filter((geom) => geom.length > 0);
  if (cleaned.length === 0) {
    return EMPTY_GEOM;
  }
  if (cleaned.length === 1) {
    return cleaned[0];
  }
  for (const step of CLIP_QUANTIZATION_STEPS) {
    const prepared =
      step > 0 ? cleaned.map((geom) => quantizeGeom(geom, step)) : cleaned;
    try {
      const [first, ...rest] = prepared;
      return polygonClipping.union(first, ...rest) as Geom;
    } catch {
      // 换一个量化精度重试
    }
  }
  return cleaned.flatMap(toPolygons) as unknown as Geom;
}

export function pointInRing(point: Point, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      (yi > point.y) !== (yj > point.y) &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 0.000001) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

export function pointInGeom(point: Point, geom: Geom | null | undefined): boolean {
  for (const polygon of toPolygons(geom)) {
    const outer = polygon[0];
    if (!outer || !pointInRing(point, outer)) {
      continue;
    }
    let insideHole = false;
    for (let i = 1; i < polygon.length; i++) {
      if (pointInRing(point, polygon[i])) {
        insideHole = true;
        break;
      }
    }
    if (!insideHole) {
      return true;
    }
  }
  return false;
}

function orientation(a: [number, number], b: [number, number], c: [number, number]) {
  const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  if (Math.abs(value) <= Number.EPSILON) {
    return 0;
  }
  return value > 0 ? 1 : 2;
}

function onSegment(
  a: [number, number],
  b: [number, number],
  c: [number, number]
): boolean {
  return (
    b[0] <= Math.max(a[0], c[0]) &&
    b[0] >= Math.min(a[0], c[0]) &&
    b[1] <= Math.max(a[1], c[1]) &&
    b[1] >= Math.min(a[1], c[1])
  );
}

function segmentsIntersect(
  p1: [number, number],
  q1: [number, number],
  p2: [number, number],
  q2: [number, number]
): boolean {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);
  if (o1 !== o2 && o3 !== o4) {
    return true;
  }
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  return false;
}

function ringEdges(ring: Ring): [number, number][][] {
  const edges: [number, number][][] = [];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    edges.push([ring[j], ring[i]]);
  }
  return edges;
}

/**
 * 不依赖 `polygon-clipping` 的相交判定（用于裁剪失败时的兜底）。
 * 两个多边形相交当且仅当：一方存在顶点落在另一方内部，或双方的边相交。
 */
export function geomsIntersect(geom: Geom, ring: Ring): boolean {
  const polygons = toPolygons(geom);
  if (polygons.length === 0 || ring.length < 3) {
    return false;
  }
  // 1. 环的顶点落在几何内部
  for (const point of ring) {
    if (pointInGeom({ x: point[0], y: point[1] }, geom)) {
      return true;
    }
  }
  const cellEdges = ringEdges(ring);
  for (const polygon of polygons) {
    for (const geomRing of polygon) {
      // 2. 几何的顶点落在环内部
      for (const point of geomRing) {
        if (pointInRing({ x: point[0], y: point[1] }, ring)) {
          return true;
        }
      }
      // 3. 双方的边相交
      for (const geomEdge of ringEdges(geomRing)) {
        for (const cellEdge of cellEdges) {
          if (
            segmentsIntersect(
              cellEdge[0],
              cellEdge[1],
              geomEdge[0] as [number, number],
              geomEdge[1] as [number, number]
            )
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function ringBounds(ring: Ring) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

/**
 * 用均匀采样估算 `ring` 被 `geom` 覆盖的面积比例（用于裁剪失败时的兜底）。
 * 采样点只统计落在环内的点，因此凸多边形（矩形/六边形单元）结果准确。
 */
export function coverageRatio(geom: Geom, ring: Ring, samples = 16): number {
  const polygons = toPolygons(geom);
  if (polygons.length === 0 || ring.length < 3) {
    return 0;
  }
  const bounds = ringBounds(ring);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  if (width <= 0 || height <= 0) {
    return 0;
  }
  let total = 0;
  let inside = 0;
  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < samples; j++) {
      const point = {
        x: bounds.minX + ((i + 0.5) / samples) * width,
        y: bounds.minY + ((j + 0.5) / samples) * height,
      };
      if (!pointInRing(point, ring)) {
        continue;
      }
      total++;
      if (pointInGeom(point, geom)) {
        inside++;
      }
    }
  }
  return total === 0 ? 0 : inside / total;
}
