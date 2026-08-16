import { describe, expect, it } from "vitest";
import {
  _roundHalfAwayFromZero,
  buildGridCellExpressions,
  getPointyTopAxialCell,
  getSquareCellId,
} from "./buildGridCellExpressions";

function _roundCubeCoordinatesWithDuckDbRounding(
  q: number,
  r: number,
): { q: number; r: number } {
  const cubeY = -q - r;
  let roundedQ = _roundHalfAwayFromZero(q);
  const roundedY = _roundHalfAwayFromZero(cubeY);
  let roundedR = _roundHalfAwayFromZero(r);
  const qDifference = Math.abs(roundedQ - q);
  const yDifference = Math.abs(roundedY - cubeY);
  const rDifference = Math.abs(roundedR - r);
  if (qDifference > yDifference && qDifference > rDifference) {
    roundedQ = -roundedY - roundedR;
  } else if (yDifference <= rDifference) {
    roundedR = -roundedQ - roundedY;
  }
  return { q: roundedQ, r: roundedR };
}

describe("buildGridCellExpressions", () => {
  it("builds a square envelope from floored coordinates and a quoted size", () => {
    const expressions = buildGridCellExpressions({
      grid: "square",
      xExpression: 'ST_X("point")',
      yExpression: 'ST_Y("point")',
      sizeMeters: 12_345.5,
    });

    expect(expressions.cellIdExpression).toContain("floor");
    expect(expressions.geometryExpression).toContain("ST_MakeEnvelope");
    expect(expressions.cellIdExpression).toContain("'12345.5'");
    expect(expressions.geometryExpression).toContain("'12345.5'");
  });

  it("builds a pointy-top hex polygon from a quoted size", () => {
    const expressions = buildGridCellExpressions({
      grid: "hex",
      xExpression: 'ST_X("point")',
      yExpression: 'ST_Y("point")',
      sizeMeters: 12_345.5,
    });

    expect(expressions.cellIdExpression).toContain("round");
    expect(expressions.geometryExpression).toContain("ST_MakePolygon");
    expect(expressions.geometryExpression).toContain("ST_MakeLine");
    expect(expressions.cellIdExpression).toContain("'12345.5'");
    expect(expressions.geometryExpression).toContain("'12345.5'");
  });

  it("assigns nearby and distant points to stable square cells", () => {
    expect(getSquareCellId(0, 0, 10_000)).toEqual(
      getSquareCellId(1, 1, 10_000),
    );
    expect(getSquareCellId(0, 0, 10_000)).not.toEqual(
      getSquareCellId(50_000, 50_000, 10_000),
    );
  });

  it("assigns nearby and distant points to stable pointy-top hex cells", () => {
    expect(getPointyTopAxialCell(0, 0, 10_000)).toEqual(
      getPointyTopAxialCell(1, 1, 10_000),
    );
    expect(getPointyTopAxialCell(0, 0, 10_000)).not.toEqual(
      getPointyTopAxialCell(50_000, 50_000, 10_000),
    );
  });

  it("matches DuckDB round() at negative half-cell boundaries", () => {
    const sizeMeters = 10_000;
    const x = -sizeMeters / 2;
    const y = 0;
    const fractionalQ = x / sizeMeters - y / (Math.sqrt(3) * sizeMeters);
    const fractionalR = (2 * y) / (Math.sqrt(3) * sizeMeters);

    // Fractional axial q is -0.5, and DuckDB rounds half away from zero.
    expect(_roundHalfAwayFromZero(fractionalQ)).toBe(-1);
    expect(
      _roundCubeCoordinatesWithDuckDbRounding(fractionalQ, fractionalR),
    ).toEqual({ q: -1, r: 0 });
    expect(getPointyTopAxialCell(x, y, sizeMeters)).toEqual({ q: -1, r: 0 });
  });
});
