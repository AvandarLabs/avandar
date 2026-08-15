import { describe, expect, it } from "vitest";
import { getSimplificationTolerance } from "./getSimplificationTolerance";

describe("getSimplificationTolerance", () => {
  it("uses the 512-pixel Web Mercator world at zoom zero", () => {
    expect(getSimplificationTolerance(0, 0, 0.75)).toBeCloseTo(
      (40_075_016.68557849 / 512) * 0.75,
    );
  });

  it("halves tolerance for every integer zoom band", () => {
    expect(getSimplificationTolerance(5, 0, 0.75)).toBeCloseTo(
      getSimplificationTolerance(4, 0, 0.75) / 2,
    );
  });

  it("clamps latitude to the Web Mercator limit", () => {
    expect(getSimplificationTolerance(8, 90, 0.75)).toBeCloseTo(
      getSimplificationTolerance(8, 85.051129, 0.75),
    );
  });
});
