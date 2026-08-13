import { describe, expect, it } from "vitest";
import { getLayerStatsFromFeatureCollection } from "@/views/GisApp/layers/getLayerStatsFromFeatureCollection/getLayerStatsFromFeatureCollection";

function _createCollection(
  values: ReadonlyArray<number | string | boolean | null>,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: values.map((cases, index) => {
      return {
        type: "Feature" as const,
        id: index,
        geometry: { type: "Point" as const, coordinates: [0, index] },
        properties: { cases },
      };
    }),
  };
}

describe("getLayerStatsFromFeatureCollection", () => {
  it("returns the numeric range of the requested property", () => {
    expect(
      getLayerStatsFromFeatureCollection({
        featureCollection: _createCollection([4, 19, 7]),
        valueColumnName: "cases",
      }),
    ).toEqual({ valueDomain: [4, 19] });
  });

  it("ignores null and non-numeric values", () => {
    expect(
      getLayerStatsFromFeatureCollection({
        featureCollection: _createCollection([4, null, "n/a", 9]),
        valueColumnName: "cases",
      }),
    ).toEqual({ valueDomain: [4, 9] });
  });

  it("parses numeric strings", () => {
    expect(
      getLayerStatsFromFeatureCollection({
        featureCollection: _createCollection(["12", "3"]),
        valueColumnName: "cases",
      }),
    ).toEqual({ valueDomain: [3, 12] });
  });

  it("returns no domain when nothing is numeric", () => {
    expect(
      getLayerStatsFromFeatureCollection({
        featureCollection: _createCollection([null, "n/a"]),
        valueColumnName: "cases",
      }),
    ).toEqual({ valueDomain: undefined });
  });

  it("returns a flat domain when every value is equal", () => {
    expect(
      getLayerStatsFromFeatureCollection({
        featureCollection: _createCollection([5, 5, 5]),
        valueColumnName: "cases",
      }),
    ).toEqual({ valueDomain: [5, 5] });
  });

  it("ignores booleans, NaN, and Infinity", () => {
    expect(
      getLayerStatsFromFeatureCollection({
        featureCollection: _createCollection([
          3,
          true,
          false,
          NaN,
          Infinity,
          -Infinity,
          11,
        ]),
        valueColumnName: "cases",
      }),
    ).toEqual({ valueDomain: [3, 11] });
  });

  it("ignores a whitespace-only string instead of reading it as zero", () => {
    expect(
      getLayerStatsFromFeatureCollection({
        featureCollection: _createCollection([4, "   ", 8]),
        valueColumnName: "cases",
      }),
    ).toEqual({ valueDomain: [4, 8] });
  });

  it("does not assume the domain is non-negative", () => {
    expect(
      getLayerStatsFromFeatureCollection({
        featureCollection: _createCollection([-12, -3, -20]),
        valueColumnName: "cases",
      }),
    ).toEqual({ valueDomain: [-20, -3] });
  });
});
