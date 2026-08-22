/**
 * Zoom-to-grid-resolution mapping for SQL-side point aggregation.
 */
import { describe, expect, it } from "vitest";

import { getPointAggregateCellsAcross } from "./getPointAggregateCellsAcross";

describe("getPointAggregateCellsAcross", () => {
  it("covers the world in a handful of cells at zoom 0", () => {
    // The whole world is 512px wide at zoom 0, so 50px cells give 11 across.
    expect(getPointAggregateCellsAcross({ zoomBand: 0 })).toBe(11);
  });

  it("doubles resolution for each zoom level", () => {
    const atZoomFour = getPointAggregateCellsAcross({ zoomBand: 4 });
    const atZoomFive = getPointAggregateCellsAcross({ zoomBand: 5 });
    expect(atZoomFive).toBeGreaterThan(atZoomFour * 1.9);
    expect(atZoomFive).toBeLessThan(atZoomFour * 2.1);
  });

  it("treats a negative zoom as zoom 0 rather than inverting the grid", () => {
    expect(getPointAggregateCellsAcross({ zoomBand: -3 })).toBe(
      getPointAggregateCellsAcross({ zoomBand: 0 }),
    );
  });

  it("clamps beyond MapLibre's maximum zoom", () => {
    expect(getPointAggregateCellsAcross({ zoomBand: 40 })).toBe(
      getPointAggregateCellsAcross({ zoomBand: 24 }),
    );
  });

  it("returns fewer cells for a larger cell size", () => {
    expect(
      getPointAggregateCellsAcross({ zoomBand: 8, cellSizePx: 100 }),
    ).toBeLessThan(getPointAggregateCellsAcross({ zoomBand: 8 }));
  });

  it("never returns a resolution too coarse to hold a single cell", () => {
    expect(
      getPointAggregateCellsAcross({ zoomBand: 0, cellSizePx: 100_000 }),
    ).toBe(1);
  });

  it("returns a whole number of cells", () => {
    expect(
      Number.isInteger(getPointAggregateCellsAcross({ zoomBand: 7 })),
    ).toBe(true);
  });
});
