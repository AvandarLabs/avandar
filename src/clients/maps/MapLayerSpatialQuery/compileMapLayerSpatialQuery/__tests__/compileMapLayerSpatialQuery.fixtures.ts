import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { ResolvedMapLayerMetadata } from "../../MapLayerSpatialQuery.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

function _createDataset(): Dataset.T {
  const now = new Date().toISOString();
  return Model.make("Dataset", {
    id: uuid<Dataset.Id>(),
    createdAt: now,
    updatedAt: now,
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    name: "Shapes",
    sourceType: "csv_file",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId: uuid<Workspace.Id>(),
  });
}

function _createColumn(dataset: Dataset.T, name: string): DatasetColumn.T {
  const now = new Date().toISOString();
  return Model.make("DatasetColumn", {
    id: uuid<DatasetColumn.Id>(),
    datasetId: dataset.id,
    workspaceId: dataset.workspaceId,
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

/**
 * Builds a geometry-column layer whose identifiers include SQL
 * metacharacters.
 */
export function createGeometryLayerFixture(): {
  layer: MapLayer.T;
  metadata: ResolvedMapLayerMetadata;
} {
  const dataset = _createDataset();
  const geometry = QueryColumn.makeFromDatasetColumn(
    _createColumn(dataset, 'shape"; DROP TABLE maps; --'),
  );
  const label = QueryColumn.makeFromDatasetColumn(
    _createColumn(dataset, "label"),
  );
  const emptyLayer = MapLayer.makeEmpty("Geometry");
  const layer: MapLayer.T = {
    ...emptyLayer,
    source: {
      ...emptyLayer.source,
      dataSource: dataset,
      queryColumns: [geometry, label],
    },
    popup: { columnIds: [label.id], action: undefined },
    geoBinding: {
      type: "geometryColumn",
      column: geometry.id,
      encoding: "wkt",
      family: "polygon",
      simplification: { tolerancePixels: 0.75 },
      sourceCrs: undefined,
    },
    symbology: {
      type: "fill",
      color: { type: "single", color: "#228be6" },
      opacity: 0.65,
      stroke: { color: "#1864ab", width: 1 },
    },
  };
  const metadata: ResolvedMapLayerMetadata = {
    type: "resolved",
    sourceColumnNames: new Map([
      [geometry.id, 'shape"; DROP TABLE maps; --'],
      [label.id, "label"],
    ]),
    boundary: undefined,
    aggregationMeasureColumnName: undefined,
    normalizationDenominator: undefined,
  };
  return { layer, metadata };
}

/** A grid-bin layer whose points come from the hostile geometry column. */
export function createGridBinLayerFixture(options: {
  grid: "hex" | "square";
  minCellCount?: number;
  sourceCrs?: number;
}): {
  layer: MapLayer.T;
  metadata: ResolvedMapLayerMetadata;
} {
  const fixture = createGeometryLayerFixture();
  const pointColumn = fixture.layer.source.queryColumns[0]!;
  const layer = {
    ...fixture.layer,
    sensitivity:
      options.minCellCount === undefined ?
        { mode: "exact" as const }
      : {
          mode: "aggregateOnly" as const,
          minCellCount: options.minCellCount,
          minGeoLevel: "hex",
        },
    geoBinding: {
      type: "binPointsToGrid" as const,
      grid: options.grid,
      sizeMeters: 10_000,
      points: {
        type: "geometryColumn" as const,
        column: pointColumn.id,
        encoding: "wkt" as const,
        family: "point" as const,
        simplification: undefined,
        sourceCrs: options.sourceCrs,
      },
      aggregation: {
        operation: "count" as const,
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      },
    },
    symbology: MapLayer.createDefaultFillSymbology(),
  } as MapLayer.T;
  return { layer, metadata: fixture.metadata };
}

/** Returns the cell-math section of bin SQL, without any simplification. */
export function getCellMathSql(rawSql: string): string {
  const start = rawSql.indexOf("binned_points AS (");
  const end = rawSql.indexOf("cell_values AS (");
  if (start < 0 || end <= start) {
    throw new Error("The compiled bin SQL has no cell math section");
  }
  return rawSql.slice(start, end);
}

/** Returns the direct geometry parser CTE without later simplification SQL. */
export function getParsedRowsSql(rawSql: string): string {
  const start = rawSql.indexOf("parsed_rows AS (");
  const end = rawSql.indexOf("typed_rows AS (");
  if (start < 0 || end <= start) {
    throw new Error("The compiled geometry SQL has no parser section");
  }
  return rawSql.slice(start, end);
}
