import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import {
  createQueryableLayer,
  createSpatialLayer,
} from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";

/**
 * Layer and query-result fixtures for `compileMapSnapshot` tests.
 */

/** Where the exact school sits, as `[longitude, latitude]`. */
export const SCHOOL_POSITION: readonly [number, number] = [-73.9812, 40.7514];

/** A unit square cell, as an aggregate-only layer draws. */
export const UNIT_CELL: GeoJSON.Polygon = {
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
};

/** A text query column named `name`, read from `datasetId` when given. */
export function createTextQueryColumn(
  name: string,
  datasetId: Dataset.Id = uuid<Dataset.Id>(),
): QueryColumn.T {
  const now = new Date().toISOString();
  return QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: uuid<DatasetColumn.Id>(),
      datasetId,
      workspaceId: uuid<Workspace.Id>(),
      createdAt: now,
      updatedAt: now,
      name,
      originalName: name,
      originalDataType: "VARCHAR",
      dataType: "varchar",
      detectedDataType: "VARCHAR",
      description: undefined,
      columnIdx: 2,
    }),
  );
}

/**
 * A latitude and longitude school layer whose popup lists its latitude
 * column and the school name.
 */
export function createSchoolLayer(
  sensitivity: MapLayer.Sensitivity,
): MapLayer.T {
  const base = createQueryableLayer();
  const nameColumn = createTextQueryColumn("school_name");
  const latitude = base.source.queryColumns[0]!;
  return MapLayer.withSensitivity(
    {
      ...base,
      source: {
        ...base.source,
        queryColumns: [...base.source.queryColumns, nameColumn],
      },
      popup: { columnIds: [latitude.id, nameColumn.id], action: undefined },
    },
    sensitivity,
  );
}

/** A WKT layer whose geometry column is `family`, read with `sensitivity`. */
export function createGeometryLayer(
  options: Readonly<{
    family: MapLayer.GeometryFamily;
    sensitivity: MapLayer.Sensitivity;
  }>,
): MapLayer.T {
  const base = createSpatialLayer();
  const binding = base.geoBinding;
  if (binding?.type !== "geometryColumn") {
    throw new Error("The spatial fixture binds a geometry column");
  }
  return MapLayer.withSensitivity(
    { ...base, geoBinding: { ...binding, family: options.family } },
    options.sensitivity,
  );
}

/** A buffer around `source`, carrying the source's own sensitivity. */
export function createBufferLayer(source: MapLayer.T): MapLayer.T {
  return {
    ...MapLayer.makeEmpty("Rings"),
    sensitivity: source.sensitivity,
    geoBinding: {
      type: "bufferOfLayer",
      layerId: source.id,
      distanceMeters: 1_000,
      distanceUnit: "km",
      labelColumn: undefined,
      dissolve: true,
    },
  } as MapLayer.T;
}

/** A GeoJSON feature with `properties`. */
export function createFeature(
  geometry: GeoJSON.Geometry,
  properties: GeoJSON.GeoJsonProperties = {},
): GeoJSON.Feature {
  return { type: "Feature", geometry, properties };
}

/** A query result holding `rows`. */
export function createQueryResult(
  rows: readonly UnknownRow[],
): QueryResult.T<UnknownRow> {
  return {
    id: uuid<QueryResult.Id>(),
    columns: [],
    data: [...rows],
    numRows: rows.length,
  };
}

/** A spatial query's one-row envelope holding `features`. */
export function createSpatialEnvelopeResult(
  features: readonly GeoJSON.Feature[],
): QueryResult.T<UnknownRow> {
  return createQueryResult([
    {
      __avandar_feature_collection: {
        type: "FeatureCollection",
        features: [...features],
      },
      __avandar_diagnostics: {
        sourceCount: features.length,
        parsedCount: features.length,
        invalidCount: 0,
        observedFamilies: [],
        hasMixedFamilies: false,
      },
    },
  ]);
}

/** The coordinate audit a lat/lng point layer runs before its rows. */
export function createPointAuditResult(
  mappableRowCount: number,
): QueryResult.T<UnknownRow> {
  return createQueryResult([
    {
      source_row_count: mappableRowCount,
      mappable_row_count: mappableRowCount,
      drop_null_coordinate: 0,
      drop_non_numeric_coordinate: 0,
      drop_out_of_range: 0,
      drop_suspected_lat_lng_swap: 0,
      drop_null_island: 0,
    },
  ]);
}

/** Meters between two `[longitude, latitude]` positions a short way apart. */
export function getDistanceMeters(
  from: Readonly<GeoJSON.Position>,
  to: Readonly<GeoJSON.Position>,
): number {
  const metersPerDegreeLatitude = 111_320;
  const deltaLatitudeMeters = (to[1]! - from[1]!) * metersPerDegreeLatitude;
  const deltaLongitudeMeters =
    (to[0]! - from[0]!) *
    metersPerDegreeLatitude *
    Math.cos((from[1]! * Math.PI) / 180);
  return Math.hypot(deltaLatitudeMeters, deltaLongitudeMeters);
}
