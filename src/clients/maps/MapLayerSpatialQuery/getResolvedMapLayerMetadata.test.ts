import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { describe, expect, it } from "vitest";
import { getResolvedMapLayerMetadata } from "./getResolvedMapLayerMetadata";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

function _createDataset(name = "Boundaries"): Dataset.T {
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

function _createColumn(options: {
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

function _createBoundaryLayer(options: {
  sourceDataset: Dataset.T;
  sourceKey: QueryColumn.T;
  boundaryDataset: Dataset.T;
  geometryColumn: DatasetColumn.T;
  keyColumn: DatasetColumn.T;
  measureColumn?: QueryColumn.T;
}): MapLayer.T {
  const layer = MapLayer.createArea("Cases by district");
  const aggregation: MapLayer.AreaAggregation =
    options.measureColumn ?
      {
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

function _createResolvedFixture(
  measureDataType: DatasetColumn.T["dataType"] = "double",
) {
  const sourceDataset = _createDataset("Cases");
  const sourceKeyColumn = _createColumn({
    dataset: sourceDataset,
    name: "district_code",
  });
  const measureDatasetColumn = _createColumn({
    dataset: sourceDataset,
    name: "case_count",
    dataType: measureDataType,
  });
  const sourceKey = QueryColumn.makeFromDatasetColumn(sourceKeyColumn);
  const measureColumn = QueryColumn.makeFromDatasetColumn(measureDatasetColumn);
  const boundaryDataset = _createDataset();
  const geometryColumn = _createColumn({
    dataset: boundaryDataset,
    name: 'renamed "geometry"',
  });
  const keyColumn = _createColumn({
    dataset: boundaryDataset,
    name: "pcode",
  });
  const layer = _createBoundaryLayer({
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

describe("getResolvedMapLayerMetadata", () => {
  it("resolves stable boundary column ids to their current names", () => {
    const fixture = _createResolvedFixture();
    const result = getResolvedMapLayerMetadata({
      layer: fixture.layer,
      datasets: [fixture.sourceDataset, fixture.boundaryDataset],
      datasetColumns: [
        fixture.sourceKeyColumn,
        fixture.measureDatasetColumn,
        fixture.geometryColumn,
        fixture.keyColumn,
      ],
    });

    expect(result).toMatchObject({
      type: "resolved",
      boundary: {
        datasetId: fixture.boundaryDataset.id,
        datasetName: "Boundaries",
        geometryColumnName: 'renamed "geometry"',
        keyColumnName: "pcode",
      },
      aggregationMeasureColumnName: "case_count",
    });
  });

  it("requires a deleted boundary dataset to be rebound", () => {
    const fixture = _createResolvedFixture();
    const result = getResolvedMapLayerMetadata({
      layer: fixture.layer,
      datasets: [fixture.sourceDataset],
      datasetColumns: [],
    });
    expect(result).toEqual({
      type: "rebindRequired",
      reason: "missingBoundaryDataset",
      referenceId: fixture.boundaryDataset.id,
    });
  });

  it("requires a deleted geometry column to be rebound", () => {
    const fixture = _createResolvedFixture();
    const result = getResolvedMapLayerMetadata({
      layer: fixture.layer,
      datasets: [fixture.sourceDataset, fixture.boundaryDataset],
      datasetColumns: [fixture.keyColumn],
    });
    expect(result).toEqual({
      type: "rebindRequired",
      reason: "missingBoundaryGeometryColumn",
      referenceId: fixture.geometryColumn.id,
    });
  });

  it("rejects a nonnumeric aggregation measure", () => {
    const fixture = _createResolvedFixture("varchar");
    const result = getResolvedMapLayerMetadata({
      layer: fixture.layer,
      datasets: [fixture.sourceDataset, fixture.boundaryDataset],
      datasetColumns: [
        fixture.geometryColumn,
        fixture.keyColumn,
        fixture.sourceKeyColumn,
        fixture.measureDatasetColumn,
      ],
    });
    expect(result).toEqual({
      type: "rebindRequired",
      reason: "aggregationMeasureNotNumeric",
      referenceId: fixture.measureDatasetColumn.id,
    });
  });

  it("requires a deleted boundary join key to be rebound", () => {
    const fixture = _createResolvedFixture();
    const binding = fixture.layer.geoBinding;
    if (binding?.type !== "joinToBoundaries") {
      throw new Error("Expected a boundary join fixture");
    }
    const layer: MapLayer.T = {
      ...fixture.layer,
      source: {
        ...fixture.layer.source,
        queryColumns: fixture.layer.source.queryColumns.filter((column) => {
          return column.id !== binding.dataKeyColumn;
        }),
      },
    };

    const result = getResolvedMapLayerMetadata({
      layer,
      datasets: [fixture.sourceDataset, fixture.boundaryDataset],
      datasetColumns: [
        fixture.geometryColumn,
        fixture.keyColumn,
        fixture.measureDatasetColumn,
      ],
    });

    expect(result).toEqual({
      type: "rebindRequired",
      reason: "missingSourceColumn",
      referenceId: binding.dataKeyColumn,
    });
  });

  it("requires a deleted direct geometry column to be rebound", () => {
    const sourceDataset = _createDataset("Geometry");
    const missingColumnId = uuid<QueryColumn.Id>();
    const areaLayer = MapLayer.createArea("Areas");
    const layer: MapLayer.T = {
      ...areaLayer,
      source: { ...areaLayer.source, dataSource: sourceDataset },
      geoBinding: {
        type: "geometryColumn",
        column: missingColumnId,
        encoding: "wkt",
        family: "polygon",
        simplification: { tolerancePixels: 0.75 },
      },
    };

    expect(
      getResolvedMapLayerMetadata({
        layer,
        datasets: [sourceDataset],
        datasetColumns: [],
      }),
    ).toEqual({
      type: "rebindRequired",
      reason: "missingSourceColumn",
      referenceId: missingColumnId,
    });
  });
});
