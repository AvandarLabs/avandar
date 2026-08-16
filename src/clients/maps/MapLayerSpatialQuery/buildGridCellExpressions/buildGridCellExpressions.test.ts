import { describe, expect, it } from "vitest";
import {
  buildGridCellExpressions,
  getPointyTopAxialCell,
  getSquareCellId,
} from "./buildGridCellExpressions";

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
});
