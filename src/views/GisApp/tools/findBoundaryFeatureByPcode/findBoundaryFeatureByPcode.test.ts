import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

import { describe, expect, it } from "vitest";

/**
 * Go-to P-code lookup against loaded boundary FeatureCollections.
 */
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerSpatialFeatureProperties } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants";
import { findBoundaryFeatureByPcode } from "@/views/GisApp/tools/findBoundaryFeatureByPcode/findBoundaryFeatureByPcode";

function _createJoinLayer(): MapLayer.T {
  return {
    ...MapLayer.createArea("Districts"),
    geoBinding: {
      type: "joinToBoundaries",
      dataKeyColumn: uuid<QueryColumn.Id>(),
      matching: "exact",
      aggregation: {
        operation: "count",
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      },
      boundary: {
        datasetId: uuid<Dataset.Id>(),
        geometryColumnId: uuid<DatasetColumn.Id>(),
        geometryEncoding: "wkt",
        keyColumnId: uuid<DatasetColumn.Id>(),
        displayNameColumnId: undefined,
        simplification: { tolerancePixels: 0.75 },
      },
    },
  };
}

function _createPcodeFeature(code: string): GeoJSON.Feature {
  return {
    type: "Feature",
    properties: {
      [MapLayerSpatialFeatureProperties.boundaryKey]: code,
      [MapLayerSpatialFeatureProperties.boundaryName]: "North Kivu",
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    },
  };
}

describe("findBoundaryFeatureByPcode", () => {
  it("returns the feature whose properties match the P-code exactly", () => {
    const layer = _createJoinLayer();
    const feature = _createPcodeFeature("COD-NK");

    expect(
      findBoundaryFeatureByPcode({
        layers: [layer],
        featureCollections: new Map([
          [layer.id, { type: "FeatureCollection", features: [feature] }],
        ]),
        code: "COD-NK",
      }),
    ).toBe(feature);
  });

  it("ignores features on layers that are not boundary bindings", () => {
    const layer = MapLayer.createArea("Cases");
    const feature = _createPcodeFeature("COD-NK");

    expect(
      findBoundaryFeatureByPcode({
        layers: [layer],
        featureCollections: new Map([
          [layer.id, { type: "FeatureCollection", features: [feature] }],
        ]),
        code: "COD-NK",
      }),
    ).toBeUndefined();
  });

  it("does not match reserved feature properties such as __avandar_state", () => {
    const layer = _createJoinLayer();
    const feature: GeoJSON.Feature = {
      type: "Feature",
      properties: {
        [MapLayerSpatialFeatureProperties.boundaryKey]: "COD-NK",
        [MapLayerSpatialFeatureProperties.boundaryName]: "North Kivu",
        [MapLayerSpatialFeatureProperties.state]: "value",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
    };

    expect(
      findBoundaryFeatureByPcode({
        layers: [layer],
        featureCollections: new Map([
          [layer.id, { type: "FeatureCollection", features: [feature] }],
        ]),
        code: "value",
      }),
    ).toBeUndefined();
  });

  it("matches the boundary key, not the display name", () => {
    const layer = _createJoinLayer();
    const feature: GeoJSON.Feature = {
      type: "Feature",
      properties: {
        [MapLayerSpatialFeatureProperties.boundaryKey]: "COD-SK",
        [MapLayerSpatialFeatureProperties.boundaryName]: "COD-NK",
        [MapLayerSpatialFeatureProperties.state]: "value",
        [MapLayerSpatialFeatureProperties.value]: 42,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
    };

    expect(
      findBoundaryFeatureByPcode({
        layers: [layer],
        featureCollections: new Map([
          [layer.id, { type: "FeatureCollection", features: [feature] }],
        ]),
        code: "COD-NK",
      }),
    ).toBeUndefined();
  });

  it("matches a P-code on an aggregate-points-to-boundaries layer", () => {
    const layer: MapLayer.T = {
      ...MapLayer.createArea("Counts"),
      geoBinding: {
        type: "aggregatePointsToBoundaries",
        points: {
          type: "latLngColumns",
          latitude: uuid<QueryColumn.Id>(),
          longitude: uuid<QueryColumn.Id>(),
        },
        aggregation: {
          operation: "count",
          outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
        },
        boundary: {
          datasetId: uuid<Dataset.Id>(),
          geometryColumnId: uuid<DatasetColumn.Id>(),
          geometryEncoding: "wkt",
          keyColumnId: uuid<DatasetColumn.Id>(),
          displayNameColumnId: undefined,
          simplification: { tolerancePixels: 0.75 },
        },
      },
    };
    const feature = _createPcodeFeature("COD-NK");

    expect(
      findBoundaryFeatureByPcode({
        layers: [layer],
        featureCollections: new Map([
          [layer.id, { type: "FeatureCollection", features: [feature] }],
        ]),
        code: "COD-NK",
      }),
    ).toBe(feature);
  });
});
