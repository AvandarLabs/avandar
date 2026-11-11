import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { buildJitterSeed } from "@/views/GisApp/layers/buildJitterSeed/buildJitterSeed";
import { displaceSpatialFeatures } from "@/views/GisApp/layers/displaceSpatialFeatures/displaceSpatialFeatures";
import { jitterCoordinate } from "@/views/GisApp/layers/jitterCoordinate/jitterCoordinate";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import { createSpatialLayer } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

const METERS_PER_DEGREE_LATITUDE = 111_320;
const RADIUS_METERS = 500;
const MAP_SALT = "8f14e45f-ceea-467a-9575-1a1c0c1e7f3b";
const OTHER_MAP_SALT = "0c5d1f2a-7b3e-4c69-9d8a-2f6e4b1a3c57";

const kinshasa: GeoJSON.Position = [15.2663, -4.4419];
const goma: GeoJSON.Position = [29.2205, -1.6585];

function _createPointCollection(
  positions: readonly GeoJSON.Position[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: positions.map((position) => {
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [...position] },
        properties: { cases: 1 },
      };
    }),
  };
}

function _withSensitivity(
  layer: MapLayer.Standard,
  sensitivity: MapLayer.Standard["sensitivity"],
): MapLayer.Standard {
  return { ...layer, sensitivity };
}

function _withFamily(
  layer: MapLayer.Standard,
  family: MapLayer.GeometryFamily,
): MapLayer.Standard {
  if (layer.geoBinding?.type !== "geometryColumn") {
    throw new Error("Expected a geometry-column layer");
  }
  return { ...layer, geoBinding: { ...layer.geoBinding, family } };
}

/** Approximate ground distance between two nearby positions, in meters. */
function _getDistanceMeters(
  from: GeoJSON.Position,
  to: GeoJSON.Position,
): number {
  const [fromLongitude = 0, fromLatitude = 0] = from;
  const [toLongitude = 0, toLatitude = 0] = to;
  const latitudeRadians = (fromLatitude * Math.PI) / 180;
  const deltaX =
    (toLongitude - fromLongitude) *
    METERS_PER_DEGREE_LATITUDE *
    Math.cos(latitudeRadians);
  const deltaY = (toLatitude - fromLatitude) * METERS_PER_DEGREE_LATITUDE;
  return Math.hypot(deltaX, deltaY);
}

function _getPointPositions(
  featureCollection: GeoJSON.FeatureCollection,
): GeoJSON.Position[] {
  return featureCollection.features.map((feature) => {
    if (feature.geometry.type !== "Point") {
      throw new Error("Expected a point feature");
    }
    return feature.geometry.coordinates;
  });
}

const jitterLayer = _withSensitivity(createSpatialLayer(), {
  mode: "jitter",
  radiusMeters: RADIUS_METERS,
});

describe("displaceSpatialFeatures", () => {
  it("moves every jitter-mode WKT point off its source position, within the radius", () => {
    const featureCollection = _createPointCollection([kinshasa, goma]);

    const displaced = displaceSpatialFeatures({
      layer: jitterLayer,
      sourceLayer: jitterLayer,
      featureCollection,
      jitterSalt: MAP_SALT,
    });

    const positions = _getPointPositions(displaced);
    [kinshasa, goma].forEach((source, index) => {
      const position = positions[index] ?? source;
      expect(position).not.toEqual(source);
      expect(_getDistanceMeters(source, position)).toBeLessThanOrEqual(
        RADIUS_METERS,
      );
    });
  });

  it("displaces a WKT point exactly as a lat/lng row at the same coordinates is displaced", () => {
    const displaced = displaceSpatialFeatures({
      layer: jitterLayer,
      sourceLayer: jitterLayer,
      featureCollection: _createPointCollection([kinshasa, goma]),
      jitterSalt: MAP_SALT,
    });

    const expected = jitterCoordinate({
      longitude: goma[0] ?? 0,
      latitude: goma[1] ?? 0,
      radiusMeters: RADIUS_METERS,
      salt: MAP_SALT,
      seed: buildJitterSeed({
        layerId: jitterLayer.id,
        longitude: goma[0] ?? 0,
        latitude: goma[1] ?? 0,
        radiusMeters: RADIUS_METERS,
      }),
    });
    expect(_getPointPositions(displaced)[1]).toEqual([
      expected.longitude,
      expected.latitude,
    ]);
  });

  it("places each point at the same displaced position on every render", () => {
    const first = displaceSpatialFeatures({
      layer: jitterLayer,
      sourceLayer: jitterLayer,
      featureCollection: _createPointCollection([kinshasa, goma]),
      jitterSalt: MAP_SALT,
    });
    const second = displaceSpatialFeatures({
      layer: jitterLayer,
      sourceLayer: jitterLayer,
      featureCollection: _createPointCollection([kinshasa, goma]),
      jitterSalt: MAP_SALT,
    });
    expect(_getPointPositions(second)).toEqual(_getPointPositions(first));
  });

  it("displaces the same real point identically whatever its feature order", () => {
    const inOrder = displaceSpatialFeatures({
      layer: jitterLayer,
      sourceLayer: jitterLayer,
      featureCollection: _createPointCollection([kinshasa, goma]),
      jitterSalt: MAP_SALT,
    });
    const reordered = displaceSpatialFeatures({
      layer: jitterLayer,
      sourceLayer: jitterLayer,
      featureCollection: _createPointCollection([goma, kinshasa]),
      jitterSalt: MAP_SALT,
    });

    const [kinshasaFirst, gomaFirst] = _getPointPositions(inOrder);
    const [gomaReordered, kinshasaReordered] = _getPointPositions(reordered);
    expect(kinshasaReordered).toEqual(kinshasaFirst);
    expect(gomaReordered).toEqual(gomaFirst);
  });

  it("keys each point's displacement with the map's salt", () => {
    const displaced = displaceSpatialFeatures({
      layer: jitterLayer,
      sourceLayer: jitterLayer,
      featureCollection: _createPointCollection([kinshasa, goma]),
      jitterSalt: MAP_SALT,
    });
    const otherMap = displaceSpatialFeatures({
      layer: jitterLayer,
      sourceLayer: jitterLayer,
      featureCollection: _createPointCollection([kinshasa, goma]),
      jitterSalt: OTHER_MAP_SALT,
    });

    const positions = _getPointPositions(displaced);
    expect(_getPointPositions(otherMap)).not.toEqual(positions);
    [kinshasa, goma].forEach((source, index) => {
      const unsalted = jitterCoordinate({
        longitude: source[0] ?? 0,
        latitude: source[1] ?? 0,
        radiusMeters: RADIUS_METERS,
        salt: "",
        seed: buildJitterSeed({
          layerId: jitterLayer.id,
          longitude: source[0] ?? 0,
          latitude: source[1] ?? 0,
          radiusMeters: RADIUS_METERS,
        }),
      });
      expect(positions[index]).not.toEqual([
        unsalted.longitude,
        unsalted.latitude,
      ]);
    });
  });

  it("moves each member of a MultiPoint by its own coordinates", () => {
    const displaced = displaceSpatialFeatures({
      layer: jitterLayer,
      sourceLayer: jitterLayer,
      jitterSalt: MAP_SALT,
      featureCollection: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "MultiPoint",
              coordinates: [kinshasa, goma, kinshasa],
            },
            properties: {},
          },
        ],
      },
    });

    const geometry = displaced.features[0]?.geometry;
    if (geometry?.type !== "MultiPoint") {
      throw new Error("Expected a MultiPoint feature");
    }
    const [firstKinshasa, gomaMember, secondKinshasa] = geometry.coordinates;
    expect(firstKinshasa).not.toEqual(kinshasa);
    expect(gomaMember).not.toEqual(goma);
    // Two copies of one real point land together, so they cannot be averaged
    // back to the real point.
    expect(secondKinshasa).toEqual(firstKinshasa);
    expect(_getDistanceMeters(goma, gomaMember ?? goma)).toBeLessThanOrEqual(
      RADIUS_METERS,
    );
  });

  it("keeps feature properties while moving the geometry", () => {
    const displaced = displaceSpatialFeatures({
      layer: jitterLayer,
      sourceLayer: jitterLayer,
      featureCollection: _createPointCollection([kinshasa]),
      jitterSalt: MAP_SALT,
    });
    expect(displaced.features[0]?.properties).toEqual({ cases: 1 });
  });

  it("leaves an exact-mode WKT point layer at its source positions", () => {
    const exactLayer = createSpatialLayer();
    const featureCollection = _createPointCollection([kinshasa, goma]);

    const displaced = displaceSpatialFeatures({
      layer: exactLayer,
      sourceLayer: exactLayer,
      featureCollection,
      jitterSalt: MAP_SALT,
    });

    expect(displaced).toBe(featureCollection);
  });

  it.each(["line", "polygon"] as const)(
    "refuses to draw a jitter-mode %s geometry layer",
    (family) => {
      const layer = _withFamily(jitterLayer, family);

      expect(() => {
        return displaceSpatialFeatures({
          layer,
          sourceLayer: layer,
          featureCollection: { type: "FeatureCollection", features: [] },
          jitterSalt: MAP_SALT,
        });
      }).toThrow(SensitivityViolationError);
    },
  );

  it("refuses to buffer a jitter-mode WKT point layer, whose buffers would center on exact points", () => {
    const bufferLayer: MapLayer.Standard = {
      ...jitterLayer,
      geoBinding: {
        type: "bufferOfLayer",
        layerId: jitterLayer.id,
        distanceMeters: 1_000,
        distanceUnit: "m",
        labelColumn: undefined,
        dissolve: false,
      },
    };

    expect(() => {
      return displaceSpatialFeatures({
        layer: bufferLayer,
        sourceLayer: jitterLayer,
        featureCollection: { type: "FeatureCollection", features: [] },
        jitterSalt: MAP_SALT,
      });
    }).toThrow(SensitivityViolationError);
  });
  it("refuses to buffer a jitter-mode latitude and longitude layer, whose buffers would center on exact points", () => {
    const latLngSource: MapLayer.Standard = {
      ...jitterLayer,
      geoBinding: {
        type: "latLngColumns",
        latitude: uuid<QueryColumn.Id>(),
        longitude: uuid<QueryColumn.Id>(),
      },
    };
    const bufferLayer: MapLayer.Standard = {
      ...jitterLayer,
      geoBinding: {
        type: "bufferOfLayer",
        layerId: latLngSource.id,
        distanceMeters: 1_000,
        distanceUnit: "m",
        labelColumn: undefined,
        dissolve: false,
      },
    };

    expect(() => {
      return displaceSpatialFeatures({
        layer: bufferLayer,
        sourceLayer: latLngSource,
        featureCollection: { type: "FeatureCollection", features: [] },
        jitterSalt: MAP_SALT,
      });
    }).toThrow(SensitivityViolationError);
  });
});
