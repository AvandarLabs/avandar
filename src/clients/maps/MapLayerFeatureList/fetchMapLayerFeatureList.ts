import { isPlainObject, prop, propEq } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { compileMapLayerFeatureListSql } from "./compileMapLayerFeatureListSql/compileMapLayerFeatureListSql";
import { compileMapLayerFeatureSource } from "./compileMapLayerFeatureSource/compileMapLayerFeatureSource";
import { getFeatureListAccessFromMapLayer } from "./getFeatureListAccessFromMapLayer/getFeatureListAccessFromMapLayer";
import { getFeatureListQueryColumns } from "./getFeatureListQueryColumns/getFeatureListQueryColumns";
import {
  MAP_LAYER_FEATURE_LIST_ROW_KEYS,
  MAP_LAYER_FEATURE_LIST_SQL_COLUMNS,
} from "./MapLayerFeatureList.constants";
import { sortMapLayerFeatureListRows } from "./sortMapLayerFeatureListRows/sortMapLayerFeatureListRows";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type {
  FetchMapLayerFeatureListOptions,
  MapLayerFeatureList,
  MapLayerFeatureListColumn,
  MapLayerFeatureListSort,
} from "./MapLayerFeatureList.types";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { I18n } from "@lingui/core";

/** The buffer a listed layer is filtered by, and the layer it buffers. */
type NearestBuffer = {
  binding: MapLayer.BufferOfLayerBinding;
  sourceLayer: MapLayer.T;
  labelColumn: QueryColumn.T | undefined;
};

function _getListLayer(
  config: AvaMapConfig.T,
  layerId: MapLayer.Id,
): MapLayer.T {
  const layer = config.layers.find(propEq("id", layerId));
  if (!layer) {
    throw new Error("The feature list layer is missing");
  }
  if (getFeatureListAccessFromMapLayer(layer) !== "rows") {
    throw new Error(
      "A feature list is only available for a layer with exact locations",
    );
  }
  return layer;
}

function _getNearestBuffer(
  config: AvaMapConfig.T,
  layer: MapLayer.T,
): NearestBuffer | undefined {
  const filterLayer = layer.spatialFilter
    ? config.layers.find(propEq("id", layer.spatialFilter.layerId))
    : undefined;
  const binding = filterLayer?.geoBinding;
  if (binding?.type !== "bufferOfLayer") {
    return undefined;
  }
  const sourceLayer = config.layers.find(propEq("id", binding.layerId));
  if (!sourceLayer) {
    return undefined;
  }
  if (sourceLayer.sensitivity.mode === "jitter") {
    throw new Error(
      "Distances cannot be measured from a layer with approximate locations",
    );
  }
  const labelColumn = binding.labelColumn
    ? sourceLayer.source.queryColumns.find(propEq("id", binding.labelColumn))
    : undefined;
  return { binding, sourceLayer, labelColumn };
}

function _compileListSql(
  options: Readonly<{
    listOptions: FetchMapLayerFeatureListOptions;
    layer: MapLayer.T;
    queryColumns: readonly QueryColumn.T[];
    nearest: NearestBuffer | undefined;
  }>,
): string {
  const { listOptions, nearest } = options;
  const shared = {
    config: listOptions.config,
    datasets: listOptions.datasets,
    datasetColumns: listOptions.datasetColumns,
  };
  return compileMapLayerFeatureListSql({
    layerSource: compileMapLayerFeatureSource({
      ...shared,
      layer: options.layer,
      propertyColumnIds: options.queryColumns.map(prop("id")),
    }),
    nearest: nearest
      ? {
          // Rings are drawn around every site, whatever the sites layer is
          // itself filtered by, so distances are measured to the same sites.
          source: compileMapLayerFeatureSource({
            ...shared,
            layer: { ...nearest.sourceLayer, spatialFilter: undefined },
            propertyColumnIds: nearest.labelColumn
              ? [nearest.labelColumn.id]
              : [],
          }),
          labelPropertyName: nearest.labelColumn
            ? QueryColumn.getDerivedColumnName(nearest.labelColumn)
            : undefined,
        }
      : undefined,
  });
}

function _makeListColumns(
  options: Readonly<{
    queryColumns: readonly QueryColumn.T[];
    nearest: NearestBuffer | undefined;
    i18n: I18n;
  }>,
): MapLayerFeatureListColumn[] {
  const sourceColumns = options.queryColumns.map((column) => {
    const name = QueryColumn.getDerivedColumnName(column);
    return { key: name, label: name, kind: "source" as const };
  });
  if (!options.nearest) {
    return sourceColumns;
  }
  const sourceName = options.nearest.sourceLayer.name;
  const distanceColumn = {
    key: MAP_LAYER_FEATURE_LIST_ROW_KEYS.distance,
    label: options.i18n._(msg`Distance to nearest ${sourceName}`),
    kind: "distance" as const,
  };
  const labelColumns = options.nearest.labelColumn
    ? [
        {
          key: MAP_LAYER_FEATURE_LIST_ROW_KEYS.nearestLabel,
          label: options.i18n._(msg`Nearest ${sourceName}`),
          kind: "nearestLabel" as const,
        },
      ]
    : [];
  return [...sourceColumns, distanceColumn, ...labelColumns];
}

/** A row's properties, which DuckDB returns as JSON text or an object. */
function _parseProperties(value: unknown): Readonly<Record<string, unknown>> {
  const parsed: unknown = typeof value === "string" ? JSON.parse(value) : value;
  return isPlainObject(parsed) ? parsed : {};
}

function _makeListRow(
  options: Readonly<{
    resultRow: UnknownRow;
    columns: readonly MapLayerFeatureListColumn[];
    distanceUnit: MapLayer.BufferDistanceUnit | undefined;
  }>,
): Readonly<Record<string, unknown>> {
  const { resultRow, distanceUnit } = options;
  const sqlColumns = MAP_LAYER_FEATURE_LIST_SQL_COLUMNS;
  const keys = MAP_LAYER_FEATURE_LIST_ROW_KEYS;
  const properties = _parseProperties(resultRow[sqlColumns.properties]);
  const distanceMeters = resultRow[sqlColumns.distanceMeters];
  const sourceEntries = options.columns
    .filter(propEq("kind", "source"))
    .map((column) => {
      return [column.key, properties[column.key]] as const;
    });
  return {
    ...Object.fromEntries(sourceEntries),
    [keys.distance]:
      typeof distanceMeters === "number" && distanceUnit
        ? MapLayer.getBufferDistanceFromMeters({
            distanceMeters,
            unit: distanceUnit,
          })
        : undefined,
    [keys.nearestLabel]: resultRow[sqlColumns.nearestLabel] ?? undefined,
    [keys.longitude]: resultRow[sqlColumns.longitude],
    [keys.latitude]: resultRow[sqlColumns.latitude],
  };
}

/**
 * The rows of one layer's feature list, after the map's AOI, time, and
 * spatial filters, with each row's distance to the nearest site when the
 * layer is filtered by a buffer. It runs the same compile the map draws, so
 * the list always matches the map. Use it for any list of a layer's
 * features, for example an on-screen drawer or a printed table. Rows are
 * sorted by distance ascending unless `sort` says otherwise; `totalCount` is
 * the count before `limit`.
 * @throws When the layer is missing or its sensitivity is not exact.
 */
export async function fetchMapLayerFeatureList(
  options: FetchMapLayerFeatureListOptions,
): Promise<MapLayerFeatureList> {
  const layer = _getListLayer(options.config, options.layerId);
  const queryColumns = getFeatureListQueryColumns(layer, options.columnIds);
  const nearest = _getNearestBuffer(options.config, layer);
  const queryResult = await WorkspaceQuerySession.runQuery({
    rawSql: _compileListSql({
      listOptions: options,
      layer,
      queryColumns,
      nearest,
    }),
    workspaceId: options.workspaceId,
    signal: options.signal,
  });
  const columns = _makeListColumns({
    queryColumns,
    nearest,
    i18n: options.i18n,
  });
  const distanceUnit = nearest?.binding.distanceUnit;
  const rows = queryResult.data.map((resultRow) => {
    return _makeListRow({ resultRow, columns, distanceUnit });
  });
  const defaultSort: MapLayerFeatureListSort | undefined = nearest
    ? { key: MAP_LAYER_FEATURE_LIST_ROW_KEYS.distance, direction: "asc" }
    : undefined;
  const sort = options.sort ?? defaultSort;
  const sortedRows = sort ? sortMapLayerFeatureListRows({ rows, sort }) : rows;
  return {
    columns,
    rows:
      options.limit === undefined
        ? sortedRows
        : sortedRows.slice(0, options.limit),
    totalCount: rows.length,
    distanceUnit,
  };
}
