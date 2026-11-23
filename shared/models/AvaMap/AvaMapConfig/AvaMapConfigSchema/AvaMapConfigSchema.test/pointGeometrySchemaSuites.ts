import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import { createEmptyVersion5Json } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/schemaTestFixtures.ts";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

/** Point features read from a WKT geometry column. */
function _createPointGeometry(): MapLayer.PointBinding {
  return {
    type: "geometryColumn",
    column: uuid<QueryColumn.Id>(),
    encoding: "wkt",
    family: "point",
    simplification: undefined,
    sourceCrs: undefined,
  };
}

function _createAreaAggregation(): MapLayer.AreaAggregation {
  return {
    operation: "count",
    outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
  };
}

/** A layer that aggregates point geometries into boundary polygons. */
function _createPointAggregationLayer(): MapLayer.T {
  return {
    ...MapLayer.createArea("Schools by ZIP"),
    geoBinding: {
      type: "aggregatePointsToBoundaries",
      points: _createPointGeometry(),
      boundary: {
        datasetId: uuid<Dataset.Id>(),
        geometryColumnId: uuid<DatasetColumn.Id>(),
        geometryEncoding: "wkt",
        keyColumnId: uuid<DatasetColumn.Id>(),
        displayNameColumnId: undefined,
        simplification: { tolerancePixels: 0.75 },
      },
      aggregation: _createAreaAggregation(),
    },
  } as MapLayer.T;
}

/** A layer that bins point geometries into a hex grid. */
function _createGridBinLayer(): MapLayer.T {
  return {
    ...MapLayer.createArea("Schools by hex"),
    geoBinding: {
      type: "binPointsToGrid",
      grid: "hex",
      sizeMeters: MapLayer.defaultGridSizeMeters,
      points: _createPointGeometry(),
      aggregation: _createAreaAggregation(),
    },
  } as MapLayer.T;
}

/** A point layer drawn straight from a geometry column. */
function _createPointGeometryLayer(): MapLayer.T {
  return {
    ...MapLayer.makeEmpty("Schools"),
    geoBinding: _createPointGeometry(),
  } as MapLayer.T;
}

function _createConfigWithLayer(layer: MapLayer.T): AvaMapConfig.T {
  return AvaMapConfig.withLayerAdded({
    config: AvaMapConfig.makeEmpty(),
    layer,
  });
}

describe("AvaMapConfigSchema point geometry bindings", () => {
  it.each([
    ["a point geometry column layer", _createPointGeometryLayer],
    ["a grid of point geometries", _createGridBinLayer],
    ["point geometries aggregated to boundaries", _createPointAggregationLayer],
  ])("round-trips %s through saved JSON", (_name, createLayer) => {
    const config = _createConfigWithLayer(createLayer());
    const savedJson = JSON.parse(
      JSON.stringify(AvaMapConfigSchema.toJson(config)),
    ) as unknown;

    expect(AvaMapConfigSchema.fromJson(savedJson)).toEqual(config);
  });

  it("reads a version 5 aggregation saved without the points' simplification key", () => {
    const layer = _createPointAggregationLayer();
    const savedJson = JSON.parse(
      JSON.stringify({ ...createEmptyVersion5Json(), layers: [layer] }),
    ) as unknown;

    expect(
      AvaMapConfigSchema.fromJson(savedJson).layers[0]?.geoBinding,
    ).toEqual(layer.geoBinding);
  });
});
