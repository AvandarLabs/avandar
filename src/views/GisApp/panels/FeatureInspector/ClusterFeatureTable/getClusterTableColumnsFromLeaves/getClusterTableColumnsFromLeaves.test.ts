import { describe, expect, it } from "vitest";

import { getClusterTableColumnsFromLeaves } from "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/getClusterTableColumnsFromLeaves/getClusterTableColumnsFromLeaves";

function _makeFeature(properties: Record<string, unknown>): GeoJSON.Feature {
  return {
    type: "Feature",
    id: 0,
    geometry: { type: "Point", coordinates: [0, 0] },
    properties,
  };
}

describe("getClusterTableColumnsFromLeaves", () => {
  it("collects the union of property keys across every leaf, in first-seen order", () => {
    const columns = getClusterTableColumnsFromLeaves([
      _makeFeature({ name: "Clinic A", cases: 12 }),
      _makeFeature({ cases: 4, region: "North" }),
    ]);

    expect(columns).toEqual({
      source: "properties",
      keys: ["name", "cases", "region"],
    });
  });

  it("falls back to the feature id when no leaf has any properties", () => {
    const columns = getClusterTableColumnsFromLeaves([
      _makeFeature({}),
      _makeFeature({}),
    ]);

    expect(columns).toEqual({ source: "id", keys: ["id"] });
  });

  it("falls back to the feature id for an empty leaves array", () => {
    const columns = getClusterTableColumnsFromLeaves([]);

    expect(columns).toEqual({ source: "id", keys: ["id"] });
  });
});
