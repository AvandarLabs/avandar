import { propEq } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { compileLatLngOverlaySql } from "@/clients/maps/MapLayerSpatialQuery/compileLatLngOverlaySql/compileLatLngOverlaySql";
import { runPointLayerQuery } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/runPointLayerQuery";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { runStructuredQueryWithMetadata } from "@/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata";
import { getPaintValueColumnName } from "@/views/GisApp/layers/useAvaMapRender/getPaintValueColumnName";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { MapOverlay } from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { PointLayerSource } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/runPointLayerQuery";
import type { MapLayerDataResult } from "@/views/GisApp/layers/MapLayerDataResult.types";

type RunLatLngLayerOptions = {
  layer: MapLayer.T;
  workspaceId: Workspace.Id;
  overlay: MapOverlay;
  zoomBand: number;
  signal?: AbortSignal;
};

function _getQueryColumnName(
  layer: MapLayer.T,
  columnId: QueryColumn.Id | undefined,
): string | undefined {
  if (!columnId) {
    return undefined;
  }
  const column = layer.source.queryColumns.find(propEq("id", columnId));
  return column === undefined
    ? undefined
    : QueryColumn.getDerivedColumnName(column);
}

/** The declared type of a layer's bound column, for SQL that depends on it. */
function _getQueryColumnDataType(
  layer: MapLayer.T,
  columnId: QueryColumn.Id | undefined,
): string | undefined {
  if (!columnId) {
    return undefined;
  }
  return layer.source.queryColumns.find(propEq("id", columnId))?.baseColumn
    .dataType;
}

/**
 * The filtered SQL and column names a lat/lng layer aggregates over.
 *
 * Returns `undefined` when the layer is not a resolvable lat/lng point layer,
 * which is the caller's signal to fall back to structured-query execution.
 */
function _getLatLngPointSource(options: {
  layer: MapLayer.T;
  overlay: MapOverlay;
}): PointLayerSource | undefined {
  const binding = options.layer.geoBinding;
  if (binding?.type !== "latLngColumns") {
    return undefined;
  }
  const sourceSql = _getLatLngOverlayRawSql(options);
  const latitudeColumnName = _getQueryColumnName(
    options.layer,
    binding.latitude,
  );
  const longitudeColumnName = _getQueryColumnName(
    options.layer,
    binding.longitude,
  );
  if (!sourceSql || !latitudeColumnName || !longitudeColumnName) {
    return undefined;
  }
  return {
    sourceSql,
    latitudeColumnName,
    longitudeColumnName,
    valueColumnName: getPaintValueColumnName(options.layer),
  };
}

function _getLatLngOverlayRawSql(options: {
  layer: MapLayer.T;
  overlay: MapOverlay;
}): string | undefined {
  const binding = options.layer.geoBinding;
  if (binding?.type !== "latLngColumns") {
    return undefined;
  }
  const sourceSql = structuredQueryToSql(options.layer.source);
  const latitudeColumnName = _getQueryColumnName(
    options.layer,
    binding.latitude,
  );
  const longitudeColumnName = _getQueryColumnName(
    options.layer,
    binding.longitude,
  );
  if (!sourceSql || !latitudeColumnName || !longitudeColumnName) {
    return undefined;
  }
  return compileLatLngOverlaySql({
    sourceSql,
    layer: options.layer,
    overlay: options.overlay,
    latitudeColumnName,
    longitudeColumnName,
    timeColumnName: _getQueryColumnName(
      options.layer,
      options.layer.timeColumn,
    ),
    timeColumnDataType: _getQueryColumnDataType(
      options.layer,
      options.layer.timeColumn,
    ),
  });
}

/**
 * Loads a lat/lng layer, letting DuckDB aggregate it when the row count would
 * cost the browser more heap than it has.
 *
 * The aggregating path needs the layer's own SQL, so it only applies when the
 * binding resolves to one. A layer that cannot compile its own source SQL falls
 * back to structured-query execution, which is also where the Data Explorer's
 * large-dataset guard lives.
 */
export async function runLatLngLayer(
  options: RunLatLngLayerOptions,
): Promise<MapLayerDataResult> {
  const pointSource = _getLatLngPointSource(options);
  if (pointSource) {
    const { queryResult, audit, aggregation } = await runPointLayerQuery({
      ...pointSource,
      zoomBand: options.zoomBand,
      runQuery: async (rawSql) => {
        return await WorkspaceQuerySession.runQuery({
          rawSql,
          workspaceId: options.workspaceId,
          signal: options.signal,
        });
      },
    });
    return {
      type: "rows",
      queryResult,
      didAutoLimit: false,
      audit,
      aggregation,
    };
  }

  const { result, didAutoLimit } = await runStructuredQueryWithMetadata({
    auth: "workspace",
    workspaceId: options.workspaceId,
    query: options.layer.source,
    rawSql: _getLatLngOverlayRawSql(options),
  });
  return { type: "rows", queryResult: result, didAutoLimit };
}
