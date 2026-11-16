import { compileLatLngLayerSourceSql } from "@/clients/maps/MapLayerSpatialQuery/compileLatLngLayerSourceSql/compileLatLngLayerSourceSql";
import { compileSpatialFilterEnvelopeSql } from "@/clients/maps/MapLayerSpatialQuery/compileSpatialFilteredQuery/compileSpatialFilteredQuery";
import { runPointLayerQuery } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/runPointLayerQuery";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { runStructuredQueryWithMetadata } from "@/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata";
import { getPaintValueColumnName } from "@/views/GisApp/layers/useAvaMapRender/getPaintValueColumnName";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  MapOverlay,
  SpatialFilterCompileOptions,
} from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { PointLayerSource } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/runPointLayerQuery";
import type { MapLayerDataResult } from "@/views/GisApp/layers/MapLayerDataResult.types";

type RunLatLngLayerOptions = {
  layer: MapLayer.T;
  workspaceId: Workspace.Id;
  overlay: MapOverlay;
  zoomBand: number;
  simplificationReferenceLatitude: number;
  stack: readonly MapLayer.T[];
  resolveMetadata: SpatialFilterCompileOptions["resolveMetadata"];
  signal?: AbortSignal;
};

/** The layer's filtered rows, or undefined when its columns are incomplete. */
function _getLatLngLayerSource(
  options: RunLatLngLayerOptions,
): ReturnType<typeof compileLatLngLayerSourceSql> {
  return compileLatLngLayerSourceSql({
    layer: options.layer,
    overlay: options.overlay,
    spatialFilterEnvelopeSql: compileSpatialFilterEnvelopeSql(options),
  });
}

/** The filtered SQL and column names a lat/lng layer aggregates over. */
function _getLatLngPointSource(
  options: RunLatLngLayerOptions,
): PointLayerSource | undefined {
  const layerSource = _getLatLngLayerSource(options);
  if (!layerSource) {
    return undefined;
  }
  return {
    sourceSql: layerSource.sql,
    latitudeColumnName: layerSource.latitudeColumnName,
    longitudeColumnName: layerSource.longitudeColumnName,
    valueColumnName: getPaintValueColumnName(options.layer),
  };
}

/**
 * Loads a lat/lng point layer's rows for `useMapLayersData`, letting DuckDB
 * aggregate the points when the row count would cost the browser more heap
 * than it has. A layer that cannot compile its own source SQL falls back to
 * structured-query execution, which is also where the Data Explorer's
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
    rawSql: _getLatLngLayerSource(options)?.sql,
  });
  return { type: "rows", queryResult: result, didAutoLimit };
}
