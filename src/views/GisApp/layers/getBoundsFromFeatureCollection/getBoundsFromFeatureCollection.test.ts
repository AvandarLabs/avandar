import { describe, expect, it } from "vitest";
import { getBoundsFromFeatureCollection } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";

function _createPoint({
  latitude,
  longitude,
}: Readonly<{ latitude: number; longitude: number }>): GeoJSON.Feature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    properties: {},
  };
}

describe("getBoundsFromFeatureCollection", () => {
  it("returns undefined for an empty collection", () => {
    expect(
      getBoundsFromFeatureCollection({
        type: "FeatureCollection",
        features: [],
      }),
    ).toBeUndefined();
  });

  it("spans every point", () => {
    expect(
      getBoundsFromFeatureCollection({
        type: "FeatureCollection",
        features: [
          _createPoint({ longitude: 15, latitude: -4 }),
          _createPoint({ longitude: 30, latitude: 10 }),
        ],
      }),
    ).toEqual([
      [15, -4],
      [30, 10],
    ]);
  });

  it("collapses to a degenerate box for a single point", () => {
    expect(
      getBoundsFromFeatureCollection({
        type: "FeatureCollection",
        features: [_createPoint({ longitude: 15, latitude: -4 })],
      }),
    ).toEqual([
      [15, -4],
      [15, -4],
    ]);
  });

  it("spans polygon rings", () => {
    const polygon: GeoJSON.Feature = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [10, 0],
            [10, 5],
            [0, 5],
            [0, 0],
          ],
        ],
      },
      properties: {},
    };
    expect(
      getBoundsFromFeatureCollection({
        type: "FeatureCollection",
        features: [polygon],
      }),
    ).toEqual([
      [0, 0],
      [10, 5],
    ]);
  });

  it("spans a line string", () => {
    const line: GeoJSON.Feature = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-3, 40],
          [2, 48],
        ],
      },
      properties: {},
    };
    expect(
      getBoundsFromFeatureCollection({
        type: "FeatureCollection",
        features: [line],
      }),
    ).toEqual([
      [-3, 40],
      [2, 48],
    ]);
  });

  it("walks geometry collections", () => {
    const collection: GeoJSON.Feature = {
      type: "Feature",
      geometry: {
        type: "GeometryCollection",
        geometries: [
          { type: "Point", coordinates: [1, 1] },
          { type: "Point", coordinates: [4, 9] },
        ],
      },
      properties: {},
    };
    expect(
      getBoundsFromFeatureCollection({
        type: "FeatureCollection",
        features: [collection],
      }),
    ).toEqual([
      [1, 1],
      [4, 9],
    ]);
  });

  it("ignores features with no geometry", () => {
    const withoutGeometry: GeoJSON.Feature = {
      type: "Feature",
      geometry: null as unknown as GeoJSON.Geometry,
      properties: {},
    };
    expect(
      getBoundsFromFeatureCollection({
        type: "FeatureCollection",
        features: [
          withoutGeometry,
          _createPoint({ longitude: 7, latitude: 7 }),
        ],
      }),
    ).toEqual([
      [7, 7],
      [7, 7],
    ]);
  });

  it("spans a multi point", () => {
    const multiPoint: GeoJSON.Feature = {
      type: "Feature",
      geometry: {
        type: "MultiPoint",
        coordinates: [
          [10, 20],
          [-5, 35],
        ],
      },
      properties: {},
    };
    expect(
      getBoundsFromFeatureCollection({
        type: "FeatureCollection",
        features: [multiPoint],
      }),
    ).toEqual([
      [-5, 20],
      [10, 35],
    ]);
  });

  it("spans a multi line string", () => {
    const multiLine: GeoJSON.Feature = {
      type: "Feature",
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [0, 0],
            [1, 1],
          ],
          [
            [20, -10],
            [25, -8],
          ],
        ],
      },
      properties: {},
    };
    expect(
      getBoundsFromFeatureCollection({
        type: "FeatureCollection",
        features: [multiLine],
      }),
    ).toEqual([
      [0, -10],
      [25, 1],
    ]);
  });

  it("spans a multi polygon", () => {
    const multiPolygon: GeoJSON.Feature = {
      type: "Feature",
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
          [
            [
              [30, 30],
              [32, 30],
              [32, 32],
              [30, 32],
              [30, 30],
            ],
          ],
        ],
      },
      properties: {},
    };
    expect(
      getBoundsFromFeatureCollection({
        type: "FeatureCollection",
        features: [multiPolygon],
      }),
    ).toEqual([
      [0, 0],
      [32, 32],
    ]);
  });

  it("ignores an altitude component nested in a line string", () => {
    const line: GeoJSON.Feature = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [10, 20, 500],
          [12, 22, 900],
        ],
      },
      properties: {},
    };
    expect(
      getBoundsFromFeatureCollection({
        type: "FeatureCollection",
        features: [line],
      }),
    ).toEqual([
      [10, 20],
      [12, 22],
    ]);
  });

  it("returns undefined for an empty coordinates array", () => {
    const emptyLine: GeoJSON.Feature = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [] },
      properties: {},
    };
    expect(
      getBoundsFromFeatureCollection({
        type: "FeatureCollection",
        features: [emptyLine],
      }),
    ).toBeUndefined();
  });

  it("returns undefined for an empty geometry collection", () => {
    const emptyCollection: GeoJSON.Feature = {
      type: "Feature",
      geometry: { type: "GeometryCollection", geometries: [] },
      properties: {},
    };
    expect(
      getBoundsFromFeatureCollection({
        type: "FeatureCollection",
        features: [emptyCollection],
      }),
    ).toBeUndefined();
  });

  it("walks a geometry collection nested inside another", () => {
    const nested: GeoJSON.Feature = {
      type: "Feature",
      geometry: {
        type: "GeometryCollection",
        geometries: [
          {
            type: "GeometryCollection",
            geometries: [{ type: "Point", coordinates: [3, 3] }],
          },
          { type: "Point", coordinates: [-6, 12] },
        ],
      },
      properties: {},
    };
    expect(
      getBoundsFromFeatureCollection({
        type: "FeatureCollection",
        features: [nested],
      }),
    ).toEqual([
      [-6, 3],
      [3, 12],
    ]);
  });
});
