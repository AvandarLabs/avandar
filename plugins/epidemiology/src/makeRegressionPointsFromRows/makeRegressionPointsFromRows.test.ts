import { describe, expect, it } from "vitest";
import { makeRegressionPointsFromRows } from "./makeRegressionPointsFromRows";

describe("makeRegressionPointsFromRows", () => {
  it("converts bigints and numeric strings and drops non-numeric rows", () => {
    expect(
      makeRegressionPointsFromRows({
        rows: [
          { x: 1n, y: "3" },
          { x: 2, y: 5 },
          { x: null, y: 7 },
          { x: "n/a", y: 9 },
        ],
        xColumn: "x",
        yColumn: "y",
      }),
    ).toEqual([
      [1, 3],
      [2, 5],
    ]);
  });

  it("drops rows where a value is undefined, blank, or infinite", () => {
    expect(
      makeRegressionPointsFromRows({
        rows: [
          { x: 1, y: undefined },
          { x: "", y: 2 },
          { x: "  ", y: 2 },
          { x: Infinity, y: 3 },
          { x: 4, y: 8 },
        ],
        xColumn: "x",
        yColumn: "y",
      }),
    ).toEqual([[4, 8]]);
  });

  it("reads only the named columns", () => {
    expect(
      makeRegressionPointsFromRows({
        rows: [{ a: 1, b: 2, c: 3 }],
        xColumn: "a",
        yColumn: "c",
      }),
    ).toEqual([[1, 3]]);
  });

  it("returns no points for no rows", () => {
    expect(
      makeRegressionPointsFromRows({ rows: [], xColumn: "x", yColumn: "y" }),
    ).toEqual([]);
  });
});
