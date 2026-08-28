import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

/** A dataset shell, named for use as either a source or boundary dataset. */
export function createDataset(name = "Boundaries"): Dataset.T {
  const now = new Date().toISOString();
  return Model.make("Dataset", {
    id: uuid<Dataset.Id>(),
    createdAt: now,
    updatedAt: now,
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    name,
    sourceType: "csv_file",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId: uuid<Workspace.Id>(),
  });
}

/** A dataset column, defaulting to text so it can be joined or displayed. */
export function createColumn(options: {
  dataset: Dataset.T;
  name: string;
  dataType?: DatasetColumn.T["dataType"];
}): DatasetColumn.T {
  const now = new Date().toISOString();
  return Model.make("DatasetColumn", {
    id: uuid<DatasetColumn.Id>(),
    datasetId: options.dataset.id,
    workspaceId: options.dataset.workspaceId,
    createdAt: now,
    updatedAt: now,
    name: options.name,
    originalName: options.name,
    originalDataType: "VARCHAR",
    dataType: options.dataType ?? "varchar",
    detectedDataType: "VARCHAR",
    description: undefined,
    columnIdx: 0,
  });
}

/** An area layer joined to a boundary dataset, with an optional measure. */
export function createBoundaryLayer(options: {
  sourceDataset: Dataset.T;
  sourceKey: QueryColumn.T;
  boundaryDataset: Dataset.T;
  geometryColumn: DatasetColumn.T;
  keyColumn: DatasetColumn.T;
  measureColumn?: QueryColumn.T;
}): MapLayer.T {
  const layer = MapLayer.createArea("Cases by district");
  const aggregation: MapLayer.AreaAggregation = options.measureColumn
    ? {
        operation: "sum",
        measureColumn: options.measureColumn.id,
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      }
    : {
        operation: "count",
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      };
  return {
    ...layer,
    source: {
      ...layer.source,
      dataSource: options.sourceDataset,
      queryColumns: [options.sourceKey, options.measureColumn].filter(
        (column): column is QueryColumn.T => {
          return column !== undefined;
        },
      ),
    },
    geoBinding: {
      type: "joinToBoundaries",
      dataKeyColumn: options.sourceKey.id,
      matching: "exact",
      aggregation,
      boundary: {
        datasetId: options.boundaryDataset.id,
        geometryColumnId: options.geometryColumn.id,
        geometryEncoding: "wkt",
        keyColumnId: options.keyColumn.id,
        displayNameColumnId: undefined,
        simplification: { tolerancePixels: 0.75 },
      },
    },
  };
}

/** A grid-bin layer that sums one numeric query column per cell. */
export function createGridBinLayer(options: {
  sourceDataset: Dataset.T;
  points: QueryColumn.T;
  measureColumn: QueryColumn.T;
}): MapLayer.T {
  const layer = MapLayer.createArea("Cases by hex");
  return {
    ...layer,
    source: {
      ...layer.source,
      dataSource: options.sourceDataset,
      queryColumns: [options.points, options.measureColumn],
    },
    geoBinding: {
      type: "binPointsToGrid",
      grid: "hex",
      sizeMeters: 10_000,
      points: {
        type: "geometryColumn",
        column: options.points.id,
        encoding: "wkt",
        family: "point",
        simplification: undefined,
        sourceCrs: undefined,
      },
      aggregation: {
        operation: "sum",
        measureColumn: options.measureColumn.id,
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      },
    },
  };
}

/**
 * A fully resolvable boundary-join fixture: a source dataset with a key and
 * measure column, joined to a boundary dataset with a geometry and key
 * column.
 */
export function createResolvedFixture(
  measureDataType: DatasetColumn.T["dataType"] = "double",
): {
  layer: MapLayer.T;
  sourceDataset: Dataset.T;
  boundaryDataset: Dataset.T;
  geometryColumn: DatasetColumn.T;
  keyColumn: DatasetColumn.T;
  sourceKeyColumn: DatasetColumn.T;
  measureDatasetColumn: DatasetColumn.T;
} {
  const sourceDataset = createDataset("Cases");
  const sourceKeyColumn = createColumn({
    dataset: sourceDataset,
    name: "district_code",
  });
  const measureDatasetColumn = createColumn({
    dataset: sourceDataset,
    name: "case_count",
    dataType: measureDataType,
  });
  const sourceKey = QueryColumn.makeFromDatasetColumn(sourceKeyColumn);
  const measureColumn = QueryColumn.makeFromDatasetColumn(measureDatasetColumn);
  const boundaryDataset = createDataset();
  const geometryColumn = createColumn({
    dataset: boundaryDataset,
    name: 'renamed "geometry"',
  });
  const keyColumn = createColumn({
    dataset: boundaryDataset,
    name: "pcode",
  });
  const layer = createBoundaryLayer({
    sourceDataset,
    sourceKey,
    boundaryDataset,
    geometryColumn,
    keyColumn,
    measureColumn,
  });
  return {
    layer,
    sourceDataset,
    boundaryDataset,
    geometryColumn,
    keyColumn,
    sourceKeyColumn,
    measureDatasetColumn,
  };
}
