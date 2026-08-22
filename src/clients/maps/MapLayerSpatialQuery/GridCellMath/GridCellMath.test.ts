import { describe, expect, it } from "vitest";

import { GridCellMath } from "./GridCellMath";

describe("GridCellMath", () => {
  it("assigns nearby and distant points to stable square cells", () => {
    expect(
      GridCellMath.getSquareCellIdFromPoint({ x: 0, y: 0, sizeMeters: 10_000 }),
    ).toEqual(
      GridCellMath.getSquareCellIdFromPoint({ x: 1, y: 1, sizeMeters: 10_000 }),
    );
    expect(
      GridCellMath.getSquareCellIdFromPoint({ x: 0, y: 0, sizeMeters: 10_000 }),
    ).not.toEqual(
      GridCellMath.getSquareCellIdFromPoint({
        x: 50_000,
        y: 50_000,
        sizeMeters: 10_000,
      }),
    );
  });

  it("assigns nearby and distant points to stable pointy-top hex cells", () => {
    expect(
      GridCellMath.getPointyTopAxialCellFromPoint({
        x: 0,
        y: 0,
        sizeMeters: 10_000,
      }),
    ).toEqual(
      GridCellMath.getPointyTopAxialCellFromPoint({
        x: 1,
        y: 1,
        sizeMeters: 10_000,
      }),
    );
    expect(
      GridCellMath.getPointyTopAxialCellFromPoint({
        x: 0,
        y: 0,
        sizeMeters: 10_000,
      }),
    ).not.toEqual(
      GridCellMath.getPointyTopAxialCellFromPoint({
        x: 50_000,
        y: 50_000,
        sizeMeters: 10_000,
      }),
    );
  });

  it("matches DuckDB round() at negative half-cell boundaries", () => {
    const sizeMeters = 10_000;
    const x = -sizeMeters / 2;
    const y = 0;
    const fractionalQ = x / sizeMeters - y / (Math.sqrt(3) * sizeMeters);

    expect(GridCellMath.roundHalfAwayFromZero(fractionalQ)).toBe(-1);
    expect(
      GridCellMath.getPointyTopAxialCellFromPoint({ x, y, sizeMeters }),
    ).toEqual({ q: -1, r: 0 });
  });
});
