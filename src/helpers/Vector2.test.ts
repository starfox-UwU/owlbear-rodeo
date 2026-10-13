import { describe, expect, it } from "vitest";

import Vector2 from "./Vector2";

/** Angles in this helper are degrees, not radians. */
const close = (value: number) => expect(value).toBeCloseTo(0, 10);

describe("Vector2 basic math", () => {
  it("computes magnitude and normalizes", () => {
    const p = new Vector2(3, 4);
    expect(Vector2.magnitude(p)).toBe(5);
    const unit = Vector2.normalize(p);
    close(Vector2.magnitude(unit) - 1);
  });

  it("handles scalar and vector arithmetic", () => {
    const a = new Vector2(1, 2);
    expect(Vector2.add(a, 2)).toEqual(new Vector2(3, 4));
    expect(Vector2.subtract(a, new Vector2(1, 1))).toEqual(new Vector2(0, 1));
    expect(Vector2.multiply(a, 3)).toEqual(new Vector2(3, 6));
    expect(Vector2.dot(a, new Vector2(2, 3))).toBe(8);
  });

  it("measures distance between points", () => {
    close(Vector2.distance(new Vector2(0, 0), new Vector2(3, 4)) - 5);
  });

  it("lerps between two points", () => {
    const result = Vector2.lerp(new Vector2(0, 0), new Vector2(10, 20), 0.25);
    expect(result).toEqual(new Vector2(2.5, 5));
  });
});

describe("Vector2 rotations", () => {
  it("rotates a point 90 degrees counter-clockwise around the origin", () => {
    const rotated = Vector2.rotate(new Vector2(1, 0), new Vector2(0, 0), 90);
    close(rotated.x);
    close(rotated.y - 1);
  });

  it("rotates around a non-zero origin", () => {
    const rotated = Vector2.rotate(new Vector2(2, 1), new Vector2(1, 1), 180);
    close(rotated.x);
    close(rotated.y - 1);
  });

  it("rotates a direction", () => {
    const rotated = Vector2.rotateDirection(new Vector2(0, 1), 90);
    close(rotated.x + 1);
    close(rotated.y);
  });
});

describe("Vector2 geometry helpers", () => {
  const square = [
    new Vector2(0, 0),
    new Vector2(10, 0),
    new Vector2(10, 10),
    new Vector2(0, 10),
  ];

  it("computes a bounding box", () => {
    expect(Vector2.getBoundingBox(square)).toEqual({
      min: { x: 0, y: 0 },
      max: { x: 10, y: 10 },
      width: 10,
      height: 10,
      center: { x: 5, y: 5 },
    });
  });

  it("detects points inside a polygon", () => {
    expect(Vector2.pointInPolygon(new Vector2(5, 5), square)).toBe(true);
    expect(Vector2.pointInPolygon(new Vector2(15, 5), square)).toBe(false);
  });

  it("accumulates the length of an open polyline", () => {
    // Three 10px segments; the path is not closed.
    close(Vector2.pathLength(square) - 30);
  });
});
