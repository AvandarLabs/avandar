import { describe, expect, it } from "vitest";

import { getSimplificationToleranceFromZoomBand } from "./getSimplificationToleranceFromZoomBand";

const _tolerance = (options: {
  zoomBand: number;
  centerLatitude: number;
}): number => {
  return getSimplificationToleranceFromZoomBand({
    ...options,
    tolerancePixels: 0.75,
  });
};

describe("getSimplificationToleranceFromZoomBand", () => {
  it("uses the 512-pixel Web Mercator world at zoom zero", () => {
    expect(_tolerance({ zoomBand: 0, centerLatitude: 0 })).toBeCloseTo(
      (40_075_016.68557849 / 512) * 0.75,
    );
  });

  it("halves tolerance for every integer zoom band", () => {
    expect(_tolerance({ zoomBand: 5, centerLatitude: 0 })).toBeCloseTo(
      _tolerance({ zoomBand: 4, centerLatitude: 0 }) / 2,
    );
  });

  it("clamps latitude to the Web Mercator limit", () => {
    expect(_tolerance({ zoomBand: 8, centerLatitude: 90 })).toBeCloseTo(
      _tolerance({ zoomBand: 8, centerLatitude: 85.051129 }),
    );
  });
});
