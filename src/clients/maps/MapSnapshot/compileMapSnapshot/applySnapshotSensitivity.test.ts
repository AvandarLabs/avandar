import { describe, expect, it } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { applySnapshotSensitivity } from "@/clients/maps/MapSnapshot/compileMapSnapshot/applySnapshotSensitivity";
import {
  createBufferLayer,
  createFeature,
  createGeometryLayer,
  SCHOOL_POSITION,
  UNIT_CELL,
} from "@/clients/maps/MapSnapshot/compileMapSnapshot/compileMapSnapshot.fixtures";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import { createGridBinLayer } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";

const JITTER = { mode: "jitter", radiusMeters: 500 } as const;
const POINT = createFeature({
  type: "Point",
  coordinates: [...SCHOOL_POSITION],
});
const CELL = createFeature(UNIT_CELL);

function _collection(
  features: readonly GeoJSON.Feature[],
): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [...features] };
}

describe("applySnapshotSensitivity", () => {
  it("returns a displaced layer's points without moving them again", () => {
    const layer = createGeometryLayer({ family: "point", sensitivity: JITTER });
    const featureCollection = _collection([POINT]);

    expect(
      applySnapshotSensitivity({ layer, stack: [layer], featureCollection }),
    ).toBe(featureCollection);
  });

  it("refuses a displaced layer's polygon", () => {
    const layer = createGeometryLayer({ family: "point", sensitivity: JITTER });

    expect(() => {
      return applySnapshotSensitivity({
        layer,
        stack: [layer],
        featureCollection: _collection([POINT, CELL]),
      });
    }).toThrow(SensitivityViolationError);
  });

  it("refuses rings around displaced points", () => {
    const points = createGeometryLayer({
      family: "point",
      sensitivity: JITTER,
    });
    const rings = createBufferLayer(points);

    expect(() => {
      return applySnapshotSensitivity({
        layer: rings,
        stack: [points, rings],
        featureCollection: _collection([]),
      });
    }).toThrow(SensitivityViolationError);
  });

  it("refuses an aggregate-only layer's point", () => {
    const points = createGeometryLayer({
      family: "point",
      sensitivity: { mode: "exact" },
    });
    const layer = MapLayer.withSensitivity(
      createGridBinLayer(points, {
        type: "latLngColumns",
        latitude: undefined,
        longitude: undefined,
      }),
      { mode: "aggregateOnly", minCellCount: 5, minGeoLevel: "admin2" },
    );

    expect(() => {
      return applySnapshotSensitivity({
        layer,
        stack: [layer],
        featureCollection: _collection([CELL, POINT]),
      });
    }).toThrow(SensitivityViolationError);
  });
});
