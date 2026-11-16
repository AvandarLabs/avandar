import { describe, expect, it } from "vitest";
import {
  clampBufferDistance,
  convertBufferDistance,
  getBufferDistanceLimitsFromUnit,
} from "@/views/GisApp/layers/bufferDistanceLimits/bufferDistanceLimits";

describe("getBufferDistanceLimitsFromUnit", () => {
  it.each([
    { unit: "m", minDistance: 100, maxDistance: 1_000_000 },
    { unit: "km", minDistance: 0.1, maxDistance: 1000 },
    { unit: "ft", minDistance: 328.09, maxDistance: 3_280_839.89 },
    { unit: "mi", minDistance: 0.07, maxDistance: 621.37 },
  ] as const)(
    "states the limits in $unit, rounding the minimum up",
    ({ unit, minDistance, maxDistance }) => {
      expect(getBufferDistanceLimitsFromUnit(unit)).toEqual({
        minDistance,
        maxDistance,
      });
    },
  );
});

describe("clampBufferDistance", () => {
  it("raises 300 ft to the smallest allowed distance in feet", () => {
    expect(clampBufferDistance({ distance: 300, unit: "ft" })).toBe(328.09);
  });

  it("lowers 2000 mi to the largest allowed distance in miles", () => {
    expect(clampBufferDistance({ distance: 2000, unit: "mi" })).toBe(621.37);
  });
});

describe("convertBufferDistance", () => {
  it("restates 1000 m as 0.62 mi", () => {
    expect(
      convertBufferDistance({ distance: 1000, fromUnit: "m", toUnit: "mi" }),
    ).toBe(0.62);
  });

  it("restates half a mile as 805 m", () => {
    expect(
      convertBufferDistance({ distance: 0.5, fromUnit: "mi", toUnit: "m" }),
    ).toBe(805);
  });

  it("keeps a converted distance within the new unit's limits", () => {
    expect(
      convertBufferDistance({ distance: 100, fromUnit: "m", toUnit: "mi" }),
    ).toBe(0.07);
  });
});
