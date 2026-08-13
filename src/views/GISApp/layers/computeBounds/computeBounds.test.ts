import { describe, expect, it } from "vitest";
import { computeBounds } from "@/views/GISApp/layers/computeBounds/computeBounds";

function createPoint(longitude: number, latitude: number): GeoJSON.Feature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    properties: {},
  };
}

describe("computeBounds", () => {
  it("returns undefined for an empty collection", () => {
    expect(
      computeBounds({ type: "FeatureCollection", features: [] }),
    ).toBeUndefined();
  });

  it("spans every point", () => {
    expect(
      computeBounds({
        type: "FeatureCollection",
        features: [createPoint(15, -4), createPoint(30, 10)],
      }),
    ).toEqual([
      [15, -4],
      [30, 10],
    ]);
  });

  it("collapses to a degenerate box for a single point", () => {
    expect(
      computeBounds({
        type: "FeatureCollection",
        features: [createPoint(15, -4)],
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
      computeBounds({ type: "FeatureCollection", features: [polygon] }),
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
      computeBounds({ type: "FeatureCollection", features: [line] }),
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
      computeBounds({ type: "FeatureCollection", features: [collection] }),
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
      computeBounds({
        type: "FeatureCollection",
        features: [withoutGeometry, createPoint(7, 7)],
      }),
    ).toEqual([
      [7, 7],
      [7, 7],
    ]);
  });
});
