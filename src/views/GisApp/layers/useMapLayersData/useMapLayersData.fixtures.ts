import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { MapOverlay } from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { ReactElement, ReactNode } from "react";

import { Model } from "@avandar/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/**
 * Layer, dataset, and QueryClient fixtures for `useMapLayersData` tests.
 */

/** Map overlay with no AOI or time range applied. */
export const EMPTY_MAP_OVERLAY: MapOverlay = {
  aoi: undefined,
  timeRange: undefined,
};

/** Unit square used as an AOI overlay in query-key tests. */
export const UNIT_SQUARE: AvaMapConfig.AoiPolygon = {
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

/**
 * An honest `DatasetColumn`, built through `Model.make` with no cast.
 * Mirrors the fixture in `MapLayerModule.test.ts`: `dataType` is a real
 * `AvaDataType` ("double"), not a loose "number", and the id field is
 * `columnIdx`.
 */
function _createNumericColumn(name: string): DatasetColumn.T {
  const now = new Date().toISOString();
  return Model.make("DatasetColumn", {
    id: uuid<DatasetColumn.Id>(),
    datasetId: uuid<Dataset.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    createdAt: now,
    updatedAt: now,
    name,
    originalName: name,
    originalDataType: "DOUBLE",
    dataType: "double",
    detectedDataType: "DOUBLE",
    description: undefined,
    columnIdx: 0,
  });
}

/** An honest `Dataset`, built through `Model.make` with no cast. */
export function createDataset(): Dataset.T {
  const now = new Date().toISOString();
  return Model.make("Dataset", {
    id: uuid<Dataset.Id>(),
    createdAt: now,
    updatedAt: now,
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    name: "Cases",
    sourceType: "csv_file",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId: uuid<Workspace.Id>(),
  });
}

/** A layer with a data source and a geo binding that resolves. */
export function createQueryableLayer(): MapLayer.Standard {
  const layer = MapLayer.makeEmpty("Cases");
  const latitude = QueryColumn.makeFromDatasetColumn(
    _createNumericColumn("lat"),
  );
  const longitude = QueryColumn.makeFromDatasetColumn(
    _createNumericColumn("lon"),
  );
  return {
    ...layer,
    source: {
      ...layer.source,
      dataSource: createDataset(),
      queryColumns: [latitude, longitude],
    },
    geoBinding: {
      type: "latLngColumns",
      latitude: latitude.id,
      longitude: longitude.id,
    },
  };
}

/** A direct WKT point layer that requires DuckDB Spatial. */
export function createSpatialLayer(): MapLayer.Standard {
  const layer = MapLayer.makeEmpty("Shapes");
  const dataset = createDataset();
  const geometry = QueryColumn.makeFromDatasetColumn(
    _createNumericColumn("shape"),
  );
  return {
    ...layer,
    source: {
      ...layer.source,
      dataSource: dataset,
      queryColumns: [geometry],
    },
    geoBinding: {
      type: "geometryColumn",
      column: geometry.id,
      encoding: "wkt",
      family: "point",
      simplification: undefined,
      sourceCrs: undefined,
    },
  };
}

/** A grid-bin layer whose points come from the given binding. */
export function createGridBinLayer(
  layer: MapLayer.T,
  points: MapLayer.PointBinding,
): MapLayer.T {
  return {
    ...layer,
    geoBinding: {
      type: "binPointsToGrid",
      grid: "hex",
      sizeMeters: 10_000,
      points,
      aggregation: {
        operation: "count",
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      },
    },
  };
}

/** Wraps a hook under test with the QueryClient it needs. */
export function wrapperForHook(options: { children: ReactNode }): ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, options.children);
}
