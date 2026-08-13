import { describe, expect, it } from "vitest";
import { computeLayerStats } from "@/views/GISApp/layers/computeLayerStats/computeLayerStats";

function createCollection(
  values: ReadonlyArray<number | string | null>,
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

describe("computeLayerStats", () => {
  it("returns the numeric range of the requested property", () => {
    expect(
      computeLayerStats({
        featureCollection: createCollection([4, 19, 7]),
        valueColumnName: "cases",
      }),
    ).toEqual({ valueDomain: [4, 19] });
  });

  it("ignores null and non-numeric values", () => {
    expect(
      computeLayerStats({
        featureCollection: createCollection([4, null, "n/a", 9]),
        valueColumnName: "cases",
      }),
    ).toEqual({ valueDomain: [4, 9] });
  });

  it("parses numeric strings", () => {
    expect(
      computeLayerStats({
        featureCollection: createCollection(["12", "3"]),
        valueColumnName: "cases",
      }),
    ).toEqual({ valueDomain: [3, 12] });
  });

  it("returns no domain when nothing is numeric", () => {
    expect(
      computeLayerStats({
        featureCollection: createCollection([null, "n/a"]),
        valueColumnName: "cases",
      }),
    ).toEqual({ valueDomain: undefined });
  });

  it("returns a flat domain when every value is equal", () => {
    expect(
      computeLayerStats({
        featureCollection: createCollection([5, 5, 5]),
        valueColumnName: "cases",
      }),
    ).toEqual({ valueDomain: [5, 5] });
  });
});
