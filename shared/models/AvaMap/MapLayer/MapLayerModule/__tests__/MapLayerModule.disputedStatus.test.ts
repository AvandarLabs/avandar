import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import {
  createBoundLayer,
  createDataset,
} from "$/models/AvaMap/MapLayer/MapLayerModule/__tests__/MapLayerModule.fixtures.ts";
import {
  QueryColumn, // prettier-ignore
} from "$/models/queries/QueryColumn/QueryColumn.ts";
import { describe, expect, it } from "vitest";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type {
  DatasetColumn, // prettier-ignore
} from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

/** An honest non-numeric `DatasetColumn`, built through `Model.make`. */
function _createTextColumn(name: string): DatasetColumn.T {
  const now = new Date().toISOString();
  return Model.make("DatasetColumn", {
    id: uuid<DatasetColumn.Id>(),
    datasetId: uuid<Dataset.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    createdAt: now,
    updatedAt: now,
    name,
    originalName: name,
    originalDataType: "VARCHAR",
    dataType: "varchar",
    detectedDataType: "VARCHAR",
    description: undefined,
    columnIdx: 0,
  });
}

/** A boundary dataset reference for an area-aggregation geo binding. */
function _makeBoundarySourceRef(): MapLayer.BoundarySource {
  return {
    datasetId: uuid<Dataset.Id>(),
    geometryColumnId: uuid<DatasetColumn.Id>(),
    geometryEncoding: "geojson",
    keyColumnId: uuid<DatasetColumn.Id>(),
    displayNameColumnId: undefined,
    simplification: { tolerancePixels: 0.75 },
  };
}

/** A stable identity for one area-aggregation output value. */
function _makeOutputId(): MapLayer.AreaAggregationOutputId {
  return uuid<MapLayer.AreaAggregationOutputId>();
}

describe("disputed status", () => {
  it("starts unbound with no values assigned", () => {
    const layer = MapLayer.makeEmpty("Admin 1");

    expect(layer.disputedStatusColumn).toBeUndefined();
    expect(layer.disputedStatusValues).toEqual({
      disputed: [],
      undetermined: [],
    });
  });

  it("does not offer the bind on a circle layer", () => {
    expect(MapLayer.canBindDisputedStatus(MapLayer.makeEmpty("Cases"))).toBe(
      false,
    );
  });

  it("does not offer the bind on a buffer layer", () => {
    const layer: MapLayer.T = {
      ...MapLayer.createArea("Buffer"),
      geoBinding: {
        type: "bufferOfLayer",
        layerId: uuid<MapLayer.Id>(),
        distanceMeters: MapLayer.defaultBufferDistanceMeters,
        dissolve: false,
      },
    };

    expect(MapLayer.canBindDisputedStatus(layer)).toBe(false);
  });

  it("offers the bind on a polygon geometry-column fill layer", () => {
    const layer: MapLayer.T = {
      ...MapLayer.createArea("Admin 1"),
      geoBinding: {
        type: "geometryColumn",
        column: uuid<QueryColumn.Id>(),
        encoding: "geojson",
        family: "polygon",
        simplification: undefined,
        sourceCrs: undefined,
      },
    };

    expect(MapLayer.canBindDisputedStatus(layer)).toBe(true);
  });

  it("offers the bind on a line-symbology geometry-column layer", () => {
    const layer: MapLayer.T = {
      ...MapLayer.createArea("Admin 1 boundary"),
      symbology: {
        type: "line",
        color: { type: "single", color: "#3b82f6" },
        stroke: { width: 1, color: "#ffffff" },
      },
      geoBinding: {
        type: "geometryColumn",
        column: uuid<QueryColumn.Id>(),
        encoding: "geojson",
        family: "polygon",
        simplification: undefined,
        sourceCrs: undefined,
      },
    };

    expect(MapLayer.canBindDisputedStatus(layer)).toBe(true);
  });

  it("offers the bind on a join-to-boundaries fill layer", () => {
    const layer: MapLayer.T = {
      ...MapLayer.createArea("Admin 1"),
      geoBinding: {
        type: "joinToBoundaries",
        dataKeyColumn: uuid<QueryColumn.Id>(),
        boundary: _makeBoundarySourceRef(),
        matching: "exact",
        aggregation: { operation: "count", outputValueId: _makeOutputId() },
      },
    };

    expect(MapLayer.canBindDisputedStatus(layer)).toBe(true);
  });

  it("offers the bind on an aggregate-points-to-boundaries fill layer", () => {
    const layer: MapLayer.T = {
      ...MapLayer.createArea("Cases by district"),
      geoBinding: {
        type: "aggregatePointsToBoundaries",
        points: {
          type: "latLngColumns",
          latitude: uuid<QueryColumn.Id>(),
          longitude: uuid<QueryColumn.Id>(),
        },
        boundary: _makeBoundarySourceRef(),
        aggregation: { operation: "count", outputValueId: _makeOutputId() },
      },
    };

    expect(MapLayer.canBindDisputedStatus(layer)).toBe(true);
  });

  it("rejects a value listed in both arrays", () => {
    expect(
      MapLayer.areDisputedStatusValuesDisjoint({
        disputed: ["Disputed"],
        undetermined: ["Disputed"],
      }),
    ).toBe(false);
  });

  it("accepts values that appear in only one array", () => {
    expect(
      MapLayer.areDisputedStatusValuesDisjoint({
        disputed: ["Disputed"],
        undetermined: ["Undetermined"],
      }),
    ).toBe(true);
  });
});

describe("toPropertyColumnNames", () => {
  it("returns 'all' unchanged when the popup already shows everything", () => {
    const layer = createBoundLayer();
    expect(MapLayer.toPropertyColumnNames(layer)).toBe("all");
  });

  it("carries a bound disputed column even when the popup trims it out", () => {
    const dataset = createDataset();
    const name = QueryColumn.makeFromDatasetColumn(_createTextColumn("name"));
    const status = QueryColumn.makeFromDatasetColumn(
      _createTextColumn("status"),
    );
    const layer: MapLayer.T = {
      ...MapLayer.createArea("Admin 1"),
      source: {
        ...MapLayer.createArea("Admin 1").source,
        dataSource: dataset,
        queryColumns: [name, status],
      },
      popup: { columnIds: [name.id], action: undefined },
      disputedStatusColumn: { type: "queryColumn", column: status.id },
    };

    expect(MapLayer.toPropertyColumnNames(layer)).toEqual([
      QueryColumn.getDerivedColumnName(name),
      QueryColumn.getDerivedColumnName(status),
    ]);
  });

  it("does not duplicate the disputed column when the popup already selects it", () => {
    const dataset = createDataset();
    const status = QueryColumn.makeFromDatasetColumn(
      _createTextColumn("status"),
    );
    const layer: MapLayer.T = {
      ...MapLayer.createArea("Admin 1"),
      source: {
        ...MapLayer.createArea("Admin 1").source,
        dataSource: dataset,
        queryColumns: [status],
      },
      popup: { columnIds: [status.id], action: undefined },
      disputedStatusColumn: { type: "queryColumn", column: status.id },
    };

    expect(MapLayer.toPropertyColumnNames(layer)).toEqual([
      QueryColumn.getDerivedColumnName(status),
    ]);
  });

  it("leaves the popup columns unchanged for a boundary-column bind", () => {
    const bound = createBoundLayer();
    const [firstColumn] = bound.source.queryColumns;
    const layer: MapLayer.T = {
      ...bound,
      popup: { columnIds: [firstColumn!.id], action: undefined },
      disputedStatusColumn: {
        type: "boundaryColumn",
        column: uuid<DatasetColumn.Id>(),
      },
    };

    expect(MapLayer.toPropertyColumnNames(layer)).toEqual([
      QueryColumn.getDerivedColumnName(firstColumn!),
    ]);
  });

  it("drops a bound query column that is no longer in the layer's query", () => {
    const dataset = createDataset();
    const name = QueryColumn.makeFromDatasetColumn(_createTextColumn("name"));
    const layer: MapLayer.T = {
      ...MapLayer.createArea("Admin 1"),
      source: {
        ...MapLayer.createArea("Admin 1").source,
        dataSource: dataset,
        queryColumns: [name],
      },
      popup: { columnIds: [name.id], action: undefined },
      disputedStatusColumn: {
        type: "queryColumn",
        column: uuid<QueryColumn.Id>(),
      },
    };

    expect(MapLayer.toPropertyColumnNames(layer)).toEqual([
      QueryColumn.getDerivedColumnName(name),
    ]);
  });
});
