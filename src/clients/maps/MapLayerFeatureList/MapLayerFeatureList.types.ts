import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { I18n } from "@lingui/core";

/** One column of a layer's feature list. */
export type MapLayerFeatureListColumn = {
  /** Row property name. */
  key: string;
  /** Already localized display label. */
  label: string;
  kind: "source" | "distance" | "nearestLabel";
};

/** Rows of one layer after AOI, time, and spatial filters. */
export type MapLayerFeatureList = {
  columns: readonly MapLayerFeatureListColumn[];
  /** Distance values are already in `distanceUnit`. */
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  /** Row count before `limit`. */
  totalCount: number;
  distanceUnit: MapLayer.BufferDistanceUnit | undefined;
};

/** One column and direction a feature list is sorted by. */
export type MapLayerFeatureListSort = {
  key: string;
  direction: "asc" | "desc";
};

/**
 * What a layer's feature list may show: every row, only a count (jittered
 * locations), or nothing (aggregate-only layers and layers without row
 * geometry).
 */
export type MapLayerFeatureListAccess = "rows" | "countOnly" | "unavailable";

/** Inputs to `fetchMapLayerFeatureList`. */
export type FetchMapLayerFeatureListOptions = {
  config: AvaMapConfig.T;
  layerId: MapLayer.Id;
  columnIds: readonly QueryColumn.Id[] | "popup";
  sort: MapLayerFeatureListSort | undefined;
  limit: number | undefined;
  workspaceId: Workspace.Id;
  datasets: readonly Dataset.T[];
  datasetColumns: readonly DatasetColumn.T[];
  /** Localizes the distance and nearest-site column labels. */
  i18n: I18n;
  signal?: AbortSignal;
};

/** Inputs to `fetchMapLayerFeatureCount`. */
export type FetchMapLayerFeatureCountOptions = Omit<
  FetchMapLayerFeatureListOptions,
  "columnIds" | "sort" | "limit" | "i18n"
>;
