import { describe, expect, it } from "vitest";

import Vector2 from "./Vector2";
import { getCellPixelSize } from "./grid";
import { getAffectedCells } from "./spellTemplates";
import { SpellTemplate, SpellTemplateRule } from "../types/SpellTemplate";
import { Grid, GridType } from "../types/Grid";

const MAP_SIZE = { x: 1000, y: 1000 };

function makeGrid(
  type: GridType,
  size = { x: 10, y: 10 },
  inset = {
    topLeft: { x: 0, y: 0 },
    bottomRight: { x: 1, y: 1 },
  }
): Grid {
  return {
    inset,
    size,
    type,
    measurement: { type: "chebyshev", scale: "5ft" },
  };
}

function makeTemplate(partial: Partial<SpellTemplate>): SpellTemplate {
  return {
    id: "template",
    type: "circle",
    origin: { x: 0.5, y: 0.5 },
    rotation: 0,
    params: { radius: 0.05 },
    style: { color: "#000000", opacity: 1, strokeWidth: 1 },
    ...partial,
  } as SpellTemplate;
}

/**
 * 复刻 `GridProvider` 中的单元格尺寸/偏移推导，保证测试使用的是真实运行时的几何。
 */
function runAffected(
  template: SpellTemplate,
  grid: Grid,
  rule: SpellTemplateRule,
  mapSize = MAP_SIZE
) {
  const gridPixelWidth =
    (grid.inset.bottomRight.x - grid.inset.topLeft.x) * mapSize.x;
  const gridPixelHeight =
    (grid.inset.bottomRight.y - grid.inset.topLeft.y) * mapSize.y;
  const cellSize = getCellPixelSize(grid, gridPixelWidth, gridPixelHeight);
  const gridOffset = Vector2.multiply(grid.inset.topLeft, mapSize);
  const gridCellOffset =
    grid.type === "square"
      ? { x: 0, y: 0 }
      : Vector2.multiply(cellSize, 0.5);
  return getAffectedCells(
    template,
    rule,
    grid,
    cellSize,
    gridOffset,
    gridCellOffset,
    mapSize
  );
}

describe("getAffectedCells", () => {
  it("returns the cells a circle touches for every grid type", () => {
    const template = makeTemplate({ type: "circle", params: { radius: 0.05 } });
    expect(runAffected(template, makeGrid("square"), "touch").length).toBe(4);
    expect(runAffected(template, makeGrid("hexVertical"), "touch").length).toBe(
      5
    );
    expect(
      runAffected(template, makeGrid("hexHorizontal"), "touch").length
    ).toBe(5);
  });

  it("applies the centre and half-area rules", () => {
    const template = makeTemplate({ type: "circle", params: { radius: 0.2 } });
    expect(runAffected(template, makeGrid("square"), "center").length).toBe(12);
    expect(runAffected(template, makeGrid("square"), "area_50").length).toBe(
      12
    );
    expect(
      runAffected(template, makeGrid("hexVertical"), "center").length
    ).toBeGreaterThan(0);
    expect(
      runAffected(template, makeGrid("hexVertical"), "area_50").length
    ).toBeGreaterThan(0);
  });

  /**
   * 这些参数曾经让 `polygon-clipping` 抛出
   * `Unable to complete output ring starting at [...]`，从而让整个工具崩溃。
   */
  it("does not throw on geometries that broke polygon-clipping", () => {
    const cases: Array<{
      gridType: GridType;
      gridSize: { x: number; y: number };
      inset: { topLeft: Vector2; bottomRight: Vector2 };
      mapSize: { x: number; y: number };
      template: SpellTemplate;
    }> = [
      {
        gridType: "hexVertical",
        gridSize: { x: 5, y: 6 },
        inset: {
          topLeft: { x: 0.02636753311380744, y: 0.09061222202144564 },
          bottomRight: { x: 0.6875462451716885, y: 0.6875462451716885 },
        },
        mapSize: { x: 2008, y: 1008 },
        template: makeTemplate({
          type: "rectangle",
          origin: { x: 0.1581027030479163, y: 0.20215553790330887 },
          rotation: -163.97871444001794,
          params: { width: 0.5735592901541924, height: 0.22291918184131634 },
        }),
      },
      {
        gridType: "hexVertical",
        gridSize: { x: 3, y: 20 },
        inset: {
          topLeft: { x: 0.10530633688904345, y: 0.04769746125675738 },
          bottomRight: { x: 0.8678788165561855, y: 0.8678788165561855 },
        },
        mapSize: { x: 767, y: 1751 },
        template: makeTemplate({
          type: "cone",
          origin: { x: 0.651174986967817, y: 0.9279445225838572 },
          rotation: -94.32454931549728,
          params: { length: 1.450074683063956, angle: 145.20371024752967 },
        }),
      },
      {
        gridType: "hexHorizontal",
        gridSize: { x: 8, y: 11 },
        inset: {
          topLeft: { x: 0.15487545183859766, y: 0.008720121113583446 },
          bottomRight: { x: 0.8917990629561245, y: 0.8917990629561245 },
        },
        mapSize: { x: 1572, y: 1567 },
        template: makeTemplate({
          type: "path",
          origin: { x: 0.2703810097012233, y: 0.008720121113583446 },
          rotation: -40.30847663059831,
          params: {
            points: [
              { x: 0.30719991857010026, y: 0.037225616170105606 },
              { x: 0.1662834987433676, y: -0.11748219575409283 },
              { x: 0.1662834987433676, y: -0.11748219575409283 },
              { x: 0.24936561559527182, y: 0.06485092616341578 },
            ],
            width: 1.8238218640117983e-10,
          },
        }),
      },
      {
        gridType: "hexVertical",
        gridSize: { x: 8, y: 20 },
        inset: {
          topLeft: { x: 0.005013533588498831, y: 0.07190664163790643 },
          bottomRight: { x: 0.5055671489099041, y: 0.5055671489099041 },
        },
        mapSize: { x: 341, y: 788 },
        template: makeTemplate({
          type: "line",
          origin: { x: 0.4429979469947284, y: 0.4392703195390672 },
          rotation: -110.5697634536773,
          params: {
            points: [
              { x: 0.9633330797512708, y: 0.5930989989324047 },
              { x: 0.9633330797512708, y: 0.5930989989324047 },
              { x: -0.19630137279701354, y: 0.06757134903684697 },
              { x: 0.9057788155490949, y: 0.6507437992680042 },
            ],
            width: 0.0000056233339395936816,
          },
        }),
      },
    ];

    for (const testCase of cases) {
      const grid = makeGrid(
        testCase.gridType,
        testCase.gridSize,
        testCase.inset
      );
      for (const rule of ["touch", "area_50", "center"] as SpellTemplateRule[]) {
        expect(() =>
          runAffected(testCase.template, grid, rule, testCase.mapSize)
        ).not.toThrow();
      }
      for (const cell of runAffected(
        testCase.template,
        grid,
        "touch",
        testCase.mapSize
      )) {
        expect(Number.isFinite(cell.center.x)).toBe(true);
        expect(Number.isFinite(cell.center.y)).toBe(true);
        for (const point of cell.polygon) {
          expect(Number.isFinite(point.x)).toBe(true);
          expect(Number.isFinite(point.y)).toBe(true);
        }
      }
    }
  });

  it("handles degenerate templates without throwing", () => {
    const templates = [
      makeTemplate({ type: "circle", params: { radius: 0 } }),
      makeTemplate({ type: "ring", params: { radius: 0, innerRadius: 0 } }),
      makeTemplate({ type: "ring", params: { radius: 0.2, innerRadius: 0.4 } }),
      makeTemplate({ type: "rectangle", params: { width: 0, height: 0 } }),
      makeTemplate({ type: "cone", params: { length: 0.2, angle: 0 } }),
      makeTemplate({
        type: "line",
        params: {
          points: [
            { x: 0.5, y: 0.5 },
            { x: 0.5, y: 0.5 },
          ],
          width: 0.02,
        },
      }),
      makeTemplate({
        type: "path",
        params: {
          points: [
            { x: 0.2, y: 0.2 },
            { x: 0.2, y: 0.2 },
            { x: 0.6, y: 0.6 },
            { x: 0.6, y: 0.6 },
          ],
          width: 0,
        },
      }),
    ];
    for (const template of templates) {
      for (const gridType of ["square", "hexVertical", "hexHorizontal"] as GridType[]) {
        for (const rule of ["touch", "area_50", "center"] as SpellTemplateRule[]) {
          expect(() =>
            runAffected(template, makeGrid(gridType), rule)
          ).not.toThrow();
        }
      }
    }
  });

  it("returns nothing when the grid has no cells", () => {
    const template = makeTemplate({});
    const grid = makeGrid("square", { x: 0, y: 0 });
    expect(runAffected(template, grid, "touch")).toEqual([]);
  });
});
