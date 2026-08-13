import { describe, expect, it } from "vitest";
import { toFeatureCollection } from "@/views/GISApp/layers/toFeatureCollection/toFeatureCollection";
import type { ResolvedGeoBinding } from "$/models/AvaMap/MapLayer/GeoBinding.types";

const binding: ResolvedGeoBinding = {
  type: "latLngColumns",
  latitudeColumnName: "lat",
  longitudeColumnName: "lon",
};

const exact = { mode: "exact" } as const;

describe("toFeatureCollection", () => {
  it("builds a point per row with the row index as the feature id", () => {
    const result = toFeatureCollection({
      rows: [{ lat: -4.44, lon: 15.27, cases: 12 }],
      binding,
      sensitivity: exact,
      layerId: "layer-1",
    });

    expect(result.featureCollection.features).toEqual([
      {
        type: "Feature",
        id: 0,
        geometry: { type: "Point", coordinates: [15.27, -4.44] },
        properties: { cases: 12 },
      },
    ]);
    expect(result.drops).toEqual([]);
  });

  it("keeps coordinate columns out of the feature properties", () => {
    const result = toFeatureCollection({
      rows: [{ lat: 1, lon: 2, cases: 3 }],
      binding,
      sensitivity: exact,
      layerId: "layer-1",
    });
    expect(result.featureCollection.features[0]?.properties).toEqual({
      cases: 3,
    });
  });

  it("reports null coordinates instead of dropping them silently", () => {
    const result = toFeatureCollection({
      rows: [
        { lat: null, lon: 2 },
        { lat: 1, lon: undefined },
      ],
      binding,
      sensitivity: exact,
      layerId: "layer-1",
    });
    expect(result.featureCollection.features).toHaveLength(0);
    expect(result.drops).toEqual([
      { reason: "nullCoordinate", count: 2, sampleRowIndexes: [0, 1] },
    ]);
  });

  it("reports non-numeric coordinates", () => {
    const result = toFeatureCollection({
      rows: [{ lat: "not a number", lon: 2 }],
      binding,
      sensitivity: exact,
      layerId: "layer-1",
    });
    expect(result.drops).toEqual([
      { reason: "nonNumericCoordinate", count: 1, sampleRowIndexes: [0] },
    ]);
  });

  it("parses numeric coordinates that arrive as strings", () => {
    const result = toFeatureCollection({
      rows: [{ lat: "-4.44", lon: "15.27" }],
      binding,
      sensitivity: exact,
      layerId: "layer-1",
    });
    expect(result.featureCollection.features[0]?.geometry).toEqual({
      type: "Point",
      coordinates: [15.27, -4.44],
    });
  });

  it("reports (0, 0) as null island rather than plotting the Atlantic", () => {
    const result = toFeatureCollection({
      rows: [{ lat: 0, lon: 0 }],
      binding,
      sensitivity: exact,
      layerId: "layer-1",
    });
    expect(result.drops).toEqual([
      { reason: "nullIsland", count: 1, sampleRowIndexes: [0] },
    ]);
  });

  it("flags a likely latitude/longitude swap", () => {
    const result = toFeatureCollection({
      rows: [{ lat: 120.5, lon: 45.1 }],
      binding,
      sensitivity: exact,
      layerId: "layer-1",
    });
    expect(result.drops).toEqual([
      { reason: "suspectedLatLngSwap", count: 1, sampleRowIndexes: [0] },
    ]);
  });

  it("reports out-of-range coordinates that are not a swap", () => {
    const result = toFeatureCollection({
      rows: [{ lat: 120.5, lon: 200.1 }],
      binding,
      sensitivity: exact,
      layerId: "layer-1",
    });
    expect(result.drops).toEqual([
      { reason: "outOfRange", count: 1, sampleRowIndexes: [0] },
    ]);
  });

  it("caps the sampled row indexes it reports", () => {
    const rows = Array.from({ length: 30 }, () => {
      return { lat: null, lon: null };
    });
    const result = toFeatureCollection({
      rows,
      binding,
      sensitivity: exact,
      layerId: "layer-1",
    });
    expect(result.drops[0]?.count).toBe(30);
    expect(result.drops[0]?.sampleRowIndexes).toHaveLength(10);
  });

  it("displaces points when the layer is jittered", () => {
    const jittered = toFeatureCollection({
      rows: [{ lat: -4.44, lon: 15.27 }],
      binding,
      sensitivity: { mode: "jitter", radiusMeters: 500 },
      layerId: "layer-1",
    });
    const [longitude, latitude] = (
      jittered.featureCollection.features[0]?.geometry as GeoJSON.Point
    ).coordinates;
    expect(longitude).not.toBe(15.27);
    expect(latitude).not.toBe(-4.44);
  });

  it("refuses to build exact points for an aggregate-only layer", () => {
    expect(() => {
      return toFeatureCollection({
        rows: [{ lat: -4.44, lon: 15.27 }],
        binding,
        sensitivity: {
          mode: "aggregateOnly",
          minCellCount: 5,
          minGeoLevel: "admin2",
        },
        layerId: "layer-1",
      });
    }).toThrow(/aggregate/i);
  });
});
