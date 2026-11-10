import { describe, expect, it } from "vitest";
import { buildJitterSeed } from "@/views/GisApp/layers/buildJitterSeed/buildJitterSeed";
import { jitterCoordinate } from "@/views/GisApp/layers/jitterCoordinate/jitterCoordinate";
import { makeFeatureCollectionFromRows } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

const binding: MapLayer.GeoBindingColumnNames = {
  type: "latLngColumns",
  latitudeColumnName: "lat",
  longitudeColumnName: "lon",
};

const exact = { mode: "exact" } as const;
const MAP_SALT = "8f14e45f-ceea-467a-9575-1a1c0c1e7f3b";

describe("makeFeatureCollectionFromRows", () => {
  it("builds a point per row with the row index as the feature id", () => {
    const result = makeFeatureCollectionFromRows({
      rows: [{ lat: -4.44, lon: 15.27, cases: 12 }],
      binding,
      propertyColumnNames: "all",
      sensitivity: exact,
      layerId: "layer-1",
      jitterSalt: MAP_SALT,
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
    const result = makeFeatureCollectionFromRows({
      rows: [{ lat: 1, lon: 2, cases: 3 }],
      binding,
      propertyColumnNames: "all",
      sensitivity: exact,
      layerId: "layer-1",
      jitterSalt: MAP_SALT,
    });
    expect(result.featureCollection.features[0]?.properties).toEqual({
      cases: 3,
    });
  });

  it("reports null coordinates instead of dropping them silently", () => {
    const result = makeFeatureCollectionFromRows({
      rows: [
        { lat: null, lon: 2 },
        { lat: 1, lon: undefined },
      ],
      binding,
      propertyColumnNames: "all",
      sensitivity: exact,
      layerId: "layer-1",
      jitterSalt: MAP_SALT,
    });
    expect(result.featureCollection.features).toHaveLength(0);
    expect(result.drops).toEqual([
      { reason: "nullCoordinate", count: 2, sampleRowIndexes: [0, 1] },
    ]);
  });

  it("reports non-numeric coordinates", () => {
    const result = makeFeatureCollectionFromRows({
      rows: [{ lat: "not a number", lon: 2 }],
      binding,
      propertyColumnNames: "all",
      sensitivity: exact,
      layerId: "layer-1",
      jitterSalt: MAP_SALT,
    });
    expect(result.drops).toEqual([
      { reason: "nonNumericCoordinate", count: 1, sampleRowIndexes: [0] },
    ]);
  });

  it("parses numeric coordinates that arrive as strings", () => {
    const result = makeFeatureCollectionFromRows({
      rows: [{ lat: "-4.44", lon: "15.27" }],
      binding,
      propertyColumnNames: "all",
      sensitivity: exact,
      layerId: "layer-1",
      jitterSalt: MAP_SALT,
    });
    expect(result.featureCollection.features[0]?.geometry).toEqual({
      type: "Point",
      coordinates: [15.27, -4.44],
    });
  });

  it("reports (0, 0) as null island rather than plotting the Atlantic", () => {
    const result = makeFeatureCollectionFromRows({
      rows: [{ lat: 0, lon: 0 }],
      binding,
      propertyColumnNames: "all",
      sensitivity: exact,
      layerId: "layer-1",
      jitterSalt: MAP_SALT,
    });
    expect(result.drops).toEqual([
      { reason: "nullIsland", count: 1, sampleRowIndexes: [0] },
    ]);
  });

  it("flags a likely latitude/longitude swap", () => {
    const result = makeFeatureCollectionFromRows({
      rows: [{ lat: 120.5, lon: 45.1 }],
      binding,
      propertyColumnNames: "all",
      sensitivity: exact,
      layerId: "layer-1",
      jitterSalt: MAP_SALT,
    });
    expect(result.drops).toEqual([
      { reason: "suspectedLatLngSwap", count: 1, sampleRowIndexes: [0] },
    ]);
  });

  it("reports out-of-range coordinates that are not a swap", () => {
    const result = makeFeatureCollectionFromRows({
      rows: [{ lat: 120.5, lon: 200.1 }],
      binding,
      propertyColumnNames: "all",
      sensitivity: exact,
      layerId: "layer-1",
      jitterSalt: MAP_SALT,
    });
    expect(result.drops).toEqual([
      { reason: "outOfRange", count: 1, sampleRowIndexes: [0] },
    ]);
  });

  it("does not call a swap when swapping would still be invalid", () => {
    const result = makeFeatureCollectionFromRows({
      rows: [{ lat: 200, lon: 45 }],
      binding,
      propertyColumnNames: "all",
      sensitivity: exact,
      layerId: "layer-1",
      jitterSalt: MAP_SALT,
    });
    expect(result.drops).toEqual([
      { reason: "outOfRange", count: 1, sampleRowIndexes: [0] },
    ]);
  });

  it("still calls a swap just past the latitude limit", () => {
    // 91 is only barely out of range as a latitude, and swapping yields the
    // valid pair (89, 91). This is the boundary the broader 120.5/45.1 case
    // above does not reach.
    const result = makeFeatureCollectionFromRows({
      rows: [{ lat: 91, lon: 89 }],
      binding,
      propertyColumnNames: "all",
      sensitivity: exact,
      layerId: "layer-1",
      jitterSalt: MAP_SALT,
    });
    expect(result.drops).toEqual([
      { reason: "suspectedLatLngSwap", count: 1, sampleRowIndexes: [0] },
    ]);
  });

  it("pins the inclusive swap boundary at (180, 90)", () => {
    const result = makeFeatureCollectionFromRows({
      rows: [{ lat: 180, lon: 90 }],
      binding,
      propertyColumnNames: "all",
      sensitivity: exact,
      layerId: "layer-1",
      jitterSalt: MAP_SALT,
    });
    expect(result.drops).toEqual([
      { reason: "suspectedLatLngSwap", count: 1, sampleRowIndexes: [0] },
    ]);
  });

  it("pins just past the swap boundary as out of range", () => {
    const result = makeFeatureCollectionFromRows({
      rows: [{ lat: 180.0001, lon: 90.0001 }],
      binding,
      propertyColumnNames: "all",
      sensitivity: exact,
      layerId: "layer-1",
      jitterSalt: MAP_SALT,
    });
    expect(result.drops).toEqual([
      { reason: "outOfRange", count: 1, sampleRowIndexes: [0] },
    ]);
  });

  it("caps the sampled row indexes it reports", () => {
    const rows = Array.from({ length: 30 }, () => {
      return { lat: null, lon: null };
    });
    const result = makeFeatureCollectionFromRows({
      rows,
      binding,
      propertyColumnNames: "all",
      sensitivity: exact,
      layerId: "layer-1",
      jitterSalt: MAP_SALT,
    });
    expect(result.drops[0]?.count).toBe(30);
    expect(result.drops[0]?.sampleRowIndexes).toHaveLength(10);
  });

  it("displaces points when the layer is jittered", () => {
    const jittered = makeFeatureCollectionFromRows({
      rows: [{ lat: -4.44, lon: 15.27 }],
      binding,
      propertyColumnNames: "all",
      sensitivity: { mode: "jitter", radiusMeters: 500 },
      layerId: "layer-1",
      jitterSalt: MAP_SALT,
    });
    const [longitude, latitude] = (
      jittered.featureCollection.features[0]?.geometry as GeoJSON.Point
    ).coordinates;
    expect(longitude).not.toBe(15.27);
    expect(latitude).not.toBe(-4.44);
  });

  it("keys each displaced point with the map's salt", () => {
    const makeJitteredPosition = (jitterSalt: string): GeoJSON.Position => {
      const result = makeFeatureCollectionFromRows({
        rows: [{ lat: -4.44, lon: 15.27 }],
        binding,
        propertyColumnNames: "all",
        sensitivity: { mode: "jitter", radiusMeters: 500 },
        layerId: "layer-1",
        jitterSalt,
      });
      return (result.featureCollection.features[0]?.geometry as GeoJSON.Point)
        .coordinates;
    };
    const expected = jitterCoordinate({
      longitude: 15.27,
      latitude: -4.44,
      radiusMeters: 500,
      salt: MAP_SALT,
      seed: buildJitterSeed({
        layerId: "layer-1",
        longitude: 15.27,
        latitude: -4.44,
        radiusMeters: 500,
      }),
    });
    const unsalted = jitterCoordinate({
      longitude: 15.27,
      latitude: -4.44,
      radiusMeters: 500,
      salt: "",
      seed: buildJitterSeed({
        layerId: "layer-1",
        longitude: 15.27,
        latitude: -4.44,
        radiusMeters: 500,
      }),
    });

    expect(makeJitteredPosition(MAP_SALT)).toEqual([
      expected.longitude,
      expected.latitude,
    ]);
    expect(makeJitteredPosition(MAP_SALT)).not.toEqual([
      unsalted.longitude,
      unsalted.latitude,
    ]);
    expect(makeJitteredPosition("another-map-salt")).not.toEqual(
      makeJitteredPosition(MAP_SALT),
    );
  });

  it("moves the same point in an unrelated direction at another radius", () => {
    const point = { lat: -4.44, lon: 15.27 };
    const makeOffset = (radiusMeters: number): [number, number] => {
      const result = makeFeatureCollectionFromRows({
        rows: [point],
        binding,
        propertyColumnNames: "all",
        sensitivity: { mode: "jitter", radiusMeters },
        layerId: "layer-1",
        jitterSalt: MAP_SALT,
      });
      const [longitude = 0, latitude = 0] = (
        result.featureCollection.features[0]?.geometry as GeoJSON.Point
      ).coordinates;
      return [longitude - point.lon, latitude - point.lat];
    };

    const [smallX, smallY] = makeOffset(500);
    const [largeX, largeY] = makeOffset(1000);

    // Offsets along one shared bearing would let a reader who saw both
    // publishes solve for the exact point, so their cross product must not
    // vanish.
    const crossProduct = smallX * largeY - smallY * largeX;
    const scale = Math.hypot(smallX, smallY) * Math.hypot(largeX, largeY);
    expect(Math.abs(crossProduct) / scale).toBeGreaterThan(1e-3);
  });

  it("displaces the same real point identically whatever its row order", () => {
    const makeJitteredPositions = (
      rows: ReadonlyArray<{ lat: number; lon: number }>,
    ): GeoJSON.Position[] => {
      const result = makeFeatureCollectionFromRows({
        rows: [...rows],
        binding,
        propertyColumnNames: "all",
        sensitivity: { mode: "jitter", radiusMeters: 500 },
        layerId: "layer-1",
        jitterSalt: MAP_SALT,
      });
      return result.featureCollection.features.map((feature) => {
        return (feature.geometry as GeoJSON.Point).coordinates;
      });
    };
    const kinshasa = { lat: -4.44, lon: 15.27 };
    const goma = { lat: -1.68, lon: 29.22 };
    const added = { lat: -2.5, lon: 28.86 };

    const [kinshasaFirst, gomaFirst] = makeJitteredPositions([kinshasa, goma]);
    const [, gomaReordered, kinshasaReordered] = makeJitteredPositions([
      added,
      goma,
      kinshasa,
    ]);

    expect(kinshasaReordered).toEqual(kinshasaFirst);
    expect(gomaReordered).toEqual(gomaFirst);
  });

  it("refuses to build exact points for an aggregate-only layer", () => {
    const caughtError = (() => {
      try {
        makeFeatureCollectionFromRows({
          rows: [{ lat: -4.44, lon: 15.27 }],
          binding,
          propertyColumnNames: "all",
          sensitivity: {
            mode: "aggregateOnly",
            minCellCount: 5,
            minGeoLevel: "admin2",
          },
          layerId: "layer-1",
          jitterSalt: MAP_SALT,
        });
        return undefined;
      } catch (error) {
        return error;
      }
    })();

    expect(caughtError).toMatchObject({ code: "aggregateOnly" });
  });
});

describe("feature properties", () => {
  it("keeps only the requested columns", () => {
    const { featureCollection } = makeFeatureCollectionFromRows({
      rows: [{ lat: 1, lng: 2, caseId: "c1", outcome: "recovered" }],
      binding: {
        type: "latLngColumns",
        latitudeColumnName: "lat",
        longitudeColumnName: "lng",
      },
      propertyColumnNames: ["caseId"],
      sensitivity: { mode: "exact" },
      layerId: "layer-1",
      jitterSalt: MAP_SALT,
    });
    expect(featureCollection.features[0]?.properties).toEqual({
      caseId: "c1",
    });
  });

  it("omits requested columns that are not own properties of the row", () => {
    const row = Object.create({ inherited: "ignore" }) as Record<
      string,
      unknown
    >;
    Object.assign(row, { lat: 1, lng: 2, caseId: "c1" });

    const { featureCollection } = makeFeatureCollectionFromRows({
      rows: [row],
      binding: {
        type: "latLngColumns",
        latitudeColumnName: "lat",
        longitudeColumnName: "lng",
      },
      propertyColumnNames: ["caseId", "missing", "inherited"],
      sensitivity: { mode: "exact" },
      layerId: "layer-1",
      jitterSalt: MAP_SALT,
    });

    expect(featureCollection.features[0]?.properties).toEqual({
      caseId: "c1",
    });
  });

  it("includes a coordinate column when it is explicitly requested", () => {
    const { featureCollection } = makeFeatureCollectionFromRows({
      rows: [{ lat: 1, lng: 2 }],
      binding: {
        type: "latLngColumns",
        latitudeColumnName: "lat",
        longitudeColumnName: "lng",
      },
      propertyColumnNames: ["lat"],
      sensitivity: { mode: "exact" },
      layerId: "layer-1",
      jitterSalt: MAP_SALT,
    });
    expect(featureCollection.features[0]?.properties).toEqual({ lat: 1 });
  });

  it("keeps every column except the bound coordinates when asked for all", () => {
    const { featureCollection } = makeFeatureCollectionFromRows({
      rows: [{ lat: 1, lng: 2, caseId: "c1" }],
      binding: {
        type: "latLngColumns",
        latitudeColumnName: "lat",
        longitudeColumnName: "lng",
      },
      propertyColumnNames: "all",
      sensitivity: { mode: "exact" },
      layerId: "layer-1",
      jitterSalt: MAP_SALT,
    });
    expect(featureCollection.features[0]?.properties).toEqual({
      caseId: "c1",
    });
  });
});
