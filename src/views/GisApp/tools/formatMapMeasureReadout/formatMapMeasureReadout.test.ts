/**
 * Measure readout unit bands: m/km and m²/km².
 */
import { describe, expect, it } from "vitest";

import { formatMapMeasureReadout } from "@/views/GisApp/tools/formatMapMeasureReadout/formatMapMeasureReadout";

describe("formatMapMeasureReadout", () => {
  it("keeps 999.9 meters in the meter band", () => {
    expect(formatMapMeasureReadout({ meters: 999.9 })).toEqual({
      kind: "length",
      meters: 999.9,
      lengthUnit: "m",
      lengthValue: 999.9,
    });
  });

  it("converts 1000 meters to kilometers", () => {
    expect(formatMapMeasureReadout({ meters: 1000 })).toEqual({
      kind: "length",
      meters: 1000,
      lengthUnit: "km",
      lengthValue: 1,
    });
  });

  it("keeps 999999.9 square meters in the square-meter band", () => {
    expect(
      formatMapMeasureReadout({ meters: 1, squareMeters: 999_999.9 }),
    ).toEqual({
      kind: "lengthAndArea",
      meters: 1,
      squareMeters: 999_999.9,
      lengthUnit: "m",
      lengthValue: 1,
      areaUnit: "m2",
      areaValue: 999_999.9,
    });
  });

  it("converts 1000000 square meters to square kilometers", () => {
    expect(
      formatMapMeasureReadout({ meters: 1, squareMeters: 1_000_000 }),
    ).toEqual({
      kind: "lengthAndArea",
      meters: 1,
      squareMeters: 1_000_000,
      lengthUnit: "m",
      lengthValue: 1,
      areaUnit: "km2",
      areaValue: 1,
    });
  });
});
