import { describe, expect, it } from "vitest";
import { makeGridCellExpressionsFromGrid } from "./makeGridCellExpressionsFromGrid";

describe("makeGridCellExpressionsFromGrid", () => {
  it("builds a square envelope from floored coordinates and a quoted size", () => {
    const expressions = makeGridCellExpressionsFromGrid({
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
    const expressions = makeGridCellExpressionsFromGrid({
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
});
