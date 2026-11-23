import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { createLayerGeometryCache } from "@/views/GisApp/layers/createLayerGeometryCache/createLayerGeometryCache";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerGeometryInputs } from "@/views/GisApp/layers/createLayerGeometryCache/createLayerGeometryCache";

const LAYER_ID = uuid<MapLayer.Id>();

const BINDING = {
  type: "latLngColumns",
  latitudeColumnName: "lat",
  longitudeColumnName: "lng",
} as const;

const ROWS = [{ lat: 1, lng: 2, caseId: "c1" }];

function _inputs(
  overrides: Partial<LayerGeometryInputs> = {},
): LayerGeometryInputs {
  return {
    layerId: LAYER_ID,
    binding: BINDING,
    sensitivity: { mode: "exact" } as const,
    propertyColumnNames: "all" as const,
    rows: ROWS,
    jitterSalt: "map-salt",
    ...overrides,
  };
}

describe("createLayerGeometryCache", () => {
  it("returns the same feature collection for unchanged inputs", () => {
    const cache = createLayerGeometryCache();
    const first = cache.get(_inputs());
    const second = cache.get(_inputs());
    expect(second.featureCollection).toBe(first.featureCollection);
  });

  it("recomputes when the rows change", () => {
    const cache = createLayerGeometryCache();
    const first = cache.get(_inputs());
    const second = cache.get(_inputs({ rows: [{ lat: 3, lng: 4 }] }));
    expect(second.featureCollection).not.toBe(first.featureCollection);
    expect(second.featureCollection.features[0]?.geometry).toEqual({
      type: "Point",
      coordinates: [4, 3],
    });
  });

  it("recomputes when the bound columns change", () => {
    const cache = createLayerGeometryCache();
    const first = cache.get(_inputs());
    const second = cache.get(
      _inputs({
        binding: { ...BINDING, latitudeColumnName: "latitude" },
      }),
    );
    expect(second.featureCollection).not.toBe(first.featureCollection);
  });

  it("recomputes when the popup selection changes", () => {
    const cache = createLayerGeometryCache();
    const first = cache.get(_inputs());
    const second = cache.get(_inputs({ propertyColumnNames: ["caseId"] }));
    expect(second.featureCollection).not.toBe(first.featureCollection);
  });

  it("recomputes when the map's jitter salt changes", () => {
    const cache = createLayerGeometryCache();
    const jitter = { mode: "jitter", radiusMeters: 500 } as const;
    const first = cache.get(_inputs({ sensitivity: jitter }));
    const second = cache.get(
      _inputs({ sensitivity: jitter, jitterSalt: "another-map-salt" }),
    );
    expect(second.featureCollection.features[0]?.geometry).not.toEqual(
      first.featureCollection.features[0]?.geometry,
    );
  });

  it("returns an empty collection and no error before the rows arrive", () => {
    const cache = createLayerGeometryCache();
    const result = cache.get(_inputs({ rows: undefined }));
    expect(result.featureCollection.features).toEqual([]);
    expect(result.error).toBeUndefined();
  });

  it("reports a sensitivity violation instead of throwing", () => {
    const cache = createLayerGeometryCache();
    const result = cache.get(
      _inputs({
        sensitivity: {
          mode: "aggregateOnly",
          minCellCount: 5,
          minGeoLevel: "",
        },
      }),
    );
    expect(result.error?.name).toBe("SensitivityViolationError");
    expect(result.featureCollection.features).toEqual([]);
  });

  it("forgets a layer that is no longer on the map", () => {
    const cache = createLayerGeometryCache();
    const first = cache.get(_inputs());
    cache.prune(new Set());
    expect(cache.get(_inputs()).featureCollection).not.toBe(
      first.featureCollection,
    );
  });
});
