import { describe, expect, it } from "vitest";
import { displaceSpatialFeatures } from "@/views/GisApp/layers/displaceSpatialFeatures/displaceSpatialFeatures";
import { jitterCoordinate } from "@/views/GisApp/layers/jitterCoordinate/jitterCoordinate";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import { createSpatialLayer } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

const METERS_PER_DEGREE_LATITUDE = 111_320;
const RADIUS_METERS = 500;

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

  it("displaces a WKT point exactly as a lat/lng row at the same index is displaced", () => {
    const displaced = displaceSpatialFeatures({
      layer: jitterLayer,
      sourceLayer: jitterLayer,
      featureCollection: _createPointCollection([kinshasa, goma]),
    });

    const expected = jitterCoordinate({
      longitude: goma[0] ?? 0,
      latitude: goma[1] ?? 0,
      radiusMeters: RADIUS_METERS,
      seed: `${jitterLayer.id}:1`,
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
    });
    const second = displaceSpatialFeatures({
      layer: jitterLayer,
      sourceLayer: jitterLayer,
      featureCollection: _createPointCollection([kinshasa, goma]),
    });
    expect(_getPointPositions(second)).toEqual(_getPointPositions(first));
  });

  it("moves each member of a MultiPoint independently", () => {
    const displaced = displaceSpatialFeatures({
      layer: jitterLayer,
      sourceLayer: jitterLayer,
      featureCollection: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "MultiPoint", coordinates: [kinshasa, kinshasa] },
            properties: {},
          },
        ],
      },
    });

    const geometry = displaced.features[0]?.geometry;
    if (geometry?.type !== "MultiPoint") {
      throw new Error("Expected a MultiPoint feature");
    }
    const [firstMember, secondMember] = geometry.coordinates;
    expect(firstMember).not.toEqual(kinshasa);
    expect(secondMember).not.toEqual(kinshasa);
    expect(firstMember).not.toEqual(secondMember);
  });

  it("keeps feature properties while moving the geometry", () => {
    const displaced = displaceSpatialFeatures({
      layer: jitterLayer,
      sourceLayer: jitterLayer,
      featureCollection: _createPointCollection([kinshasa]),
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
        dissolve: false,
      },
    };

    expect(() => {
      return displaceSpatialFeatures({
        layer: bufferLayer,
        sourceLayer: jitterLayer,
        featureCollection: { type: "FeatureCollection", features: [] },
      });
    }).toThrow(SensitivityViolationError);
  });
});
