/**
 * Buffer distance unit conversions on the `MapLayer` module.
 */
import { describe, expect, it } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";

describe("MapLayer buffer distance units", () => {
  it("stores half a mile as 805 whole meters", () => {
    expect(
      MapLayer.getMetersFromBufferDistance({ distance: 0.5, unit: "mi" }),
    ).toBe(805);
  });

  it.each([
    { distance: 1.2, unit: "km" as const, expected: 1200 },
    { distance: 1000, unit: "ft" as const, expected: 305 },
    { distance: 250, unit: "m" as const, expected: 250 },
  ])(
    "stores $distance $unit as $expected meters",
    ({ distance, unit, expected }) => {
      expect(MapLayer.getMetersFromBufferDistance({ distance, unit })).toBe(
        expected,
      );
    },
  );

  it("shows 805 meters as about half a mile", () => {
    expect(
      MapLayer.getBufferDistanceFromMeters({ distanceMeters: 805, unit: "mi" }),
    ).toBeCloseTo(0.5002, 4);
  });
});
