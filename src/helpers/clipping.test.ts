import { describe, expect, it } from "vitest";
import { Geom, Ring } from "polygon-clipping";

import {
  cleanGeom,
  cleanRing,
  coverageRatio,
  geomsIntersect,
  pointInGeom,
  pointInRing,
  quantizeGeom,
  safeIntersection,
  safeUnion,
  toPolygons,
} from "./clipping";

const square = (x: number, y: number, size: number): Ring => [
  [x, y],
  [x + size, y],
  [x + size, y + size],
  [x, y + size],
];

describe("clipping helpers", () => {
  it("normalizes Polygon and MultiPolygon input", () => {
    expect(toPolygons([[square(0, 0, 10)]] as Geom)).toHaveLength(1);
    expect(toPolygons([[square(0, 0, 10)], [square(20, 20, 10)]] as Geom)).toHaveLength(
      2
    );
    expect(toPolygons([] as Geom)).toEqual([]);
  });

  it("removes duplicate and collinear vertices", () => {
    expect(
      cleanRing([
        [0, 0],
        [0, 0],
        [5, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ])
    ).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]);
  });

  it("drops rings that collapse to a line", () => {
    expect(
      cleanRing([
        [0, 0],
        [5, 5],
        [10, 10],
      ])
    ).toEqual([]);
    expect(cleanRing([])).toEqual([]);
  });

  it("drops degenerate polygons from a geometry", () => {
    const geom = [[square(0, 0, 10)], [[[1, 1]]]] as unknown as Geom;
    expect(toPolygons(cleanGeom(geom))).toHaveLength(1);
  });

  it("quantizes coordinates to the given step", () => {
    const geom = [[square(0.0000004, 0, 10.0000006)]] as Geom;
    const quantized = toPolygons(quantizeGeom(geom, 1e-6))[0][0];
    expect(quantized).toEqual([
      [0, 0],
      [10.000001, 0],
      [10.000001, 10.000001],
      [0, 10.000001],
    ]);
  });

  it("intersects simple geometries and never throws on degenerate ones", () => {
    const result = safeIntersection(
      [[square(0, 0, 10)]] as Geom,
      [[square(5, 5, 10)]] as Geom
    );
    expect(result).not.toBeNull();
    expect(toPolygons(result)[0][0][0]).toEqual([5, 5]);

    expect(
      safeIntersection([[square(0, 0, 10)]] as Geom, [[square(50, 50, 10)]] as Geom)
    ).toEqual([]);

    // 零面积 / NaN 输入不应抛出
    expect(() =>
      safeIntersection(
        [[[[0, 0]]]] as unknown as Geom,
        [[[[1, 1], [Number.NaN, 2], [3, 3]]]] as unknown as Geom
      )
    ).not.toThrow();
    expect(() =>
      safeIntersection(
        [[[[0, 0], [0, 0], [0, 0]]]] as unknown as Geom,
        [[square(0, 0, 10)]] as Geom
      )
    ).not.toThrow();
  });

  it("unions geometries and falls back to a plain collection", () => {
    const union = safeUnion([
      [[square(0, 0, 10)]] as Geom,
      [[square(5, 5, 10)]] as Geom,
    ]);
    // 合并后是一个包含两个矩形的多边形
    expect(toPolygons(union)).toHaveLength(1);
    expect(safeUnion([])).toEqual([]);
    expect(
      toPolygons(safeUnion([[[[[0, 0]]]] as unknown as Geom]))
    ).toEqual([]);
  });

  it("detects point containment", () => {
    const ring = square(0, 0, 10);
    expect(pointInRing({ x: 5, y: 5 }, ring)).toBe(true);
    expect(pointInRing({ x: 15, y: 5 }, ring)).toBe(false);
    const withHole = [square(0, 0, 10), square(4, 4, 2)] as Geom;
    expect(pointInGeom({ x: 1, y: 1 }, withHole)).toBe(true);
    expect(pointInGeom({ x: 5, y: 5 }, withHole)).toBe(false);
  });

  it("detects intersections without polygon-clipping", () => {
    const geom = [[square(0, 0, 10)]] as Geom;
    // 重叠
    expect(geomsIntersect(geom, square(5, 5, 10))).toBe(true);
    // 一个多边形完全位于另一个内部
    expect(geomsIntersect(geom, square(2, 2, 2))).toBe(true);
    // 十字交叉，没有任何顶点位于对方内部
    const cross: Ring = [
      [-5, 4],
      [15, 4],
      [15, 6],
      [-5, 6],
    ];
    const frame = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    expect(geomsIntersect([[frame]] as Geom, cross)).toBe(true);
    // 分离
    expect(geomsIntersect(geom, square(20, 20, 5))).toBe(false);
  });

  it("estimates coverage of a cell", () => {
    const geom = [[square(0, 0, 10)]] as Geom;
    expect(coverageRatio(geom, square(0, 0, 10), 32)).toBeCloseTo(1, 2);
    expect(coverageRatio(geom, square(20, 20, 10), 16)).toBe(0);
    expect(coverageRatio(geom, square(5, 0, 10), 32)).toBeCloseTo(0.5, 1);
    expect(coverageRatio([[]] as unknown as Geom, square(0, 0, 10))).toBe(0);
  });
});
