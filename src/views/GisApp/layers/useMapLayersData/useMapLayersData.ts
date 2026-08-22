import { makeIdLookupMap, propEq } from "@avandar/utils";
import { useQueries } from "@tanstack/react-query";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { compileLatLngOverlaySql } from "@/clients/maps/MapLayerSpatialQuery/compileLatLngOverlaySql/compileLatLngOverlaySql";
import { compileMapLayerSpatialQuery } from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery";
import { getResolvedMapLayerMetadata } from "@/clients/maps/MapLayerSpatialQuery/getResolvedMapLayerMetadata/getResolvedMapLayerMetadata";
import { parseMapLayerSpatialResult } from "@/clients/maps/MapLayerSpatialQuery/parseMapLayerSpatialResult/parseMapLayerSpatialResult";
import { runPointLayerQuery } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/runPointLayerQuery";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { runStructuredQueryWithMetadata } from "@/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata";
import { getPaintValueColumnName } from "@/views/GisApp/layers/useAvaMapRender/getPaintValueColumnName";
import { MapLayerData } from "@/views/GisApp/layers/useMapLayersData/MapLayerData";
import { useDuckDbSpatialAvailability } from "@/views/GisApp/useDuckDbSpatialAvailability/useDuckDbSpatialAvailability";
import type { MapOverlay } from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { PointLayerSource } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/runPointLayerQuery";
import type { MapLayerDataResult } from "@/views/GisApp/layers/MapLayerDataResult.types";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

/** One layer's query, as the map render pipeline needs to see it. */
export type MapLayerQueryState = {
  data: MapLayerDataResult | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | undefined;
  refetch: () => void;
};

function _isSpatialBinding(layer: MapLayer.T): boolean {
  return (
    layer.geoBinding !== undefined && layer.geoBinding.type !== "latLngColumns"
  );
}

/** True when the layer query uses DuckDB Spatial functions. */
function _layerNeedsSpatial(layer: MapLayer.T, overlay: MapOverlay): boolean {
  if (_isSpatialBinding(layer)) {
    return true;
  }
  return (
    layer.geoBinding?.type === "latLngColumns" &&
    layer.applyAoiFilter &&
    overlay.aoi !== undefined
  );
}

/** True while a configured spatial layer waits on the Spatial request. */
function _isWaitingForSpatial(
  layer: MapLayer.T,
  overlay: MapOverlay,
  availability: string,
): boolean {
  return _layerNeedsSpatial(layer, overlay) && availability === "loading";
}

/** Returns a local capability error before any QETL request is attempted. */
function _getCapabilityError(
  layer: MapLayer.T,
  overlay: MapOverlay,
  availability: string,
): Error | undefined {
  return _layerNeedsSpatial(layer, overlay) && availability === "unavailable" ?
      new Error("DuckDB Spatial is unavailable for this geometry layer")
    : undefined;
}

/** Walks bufferOfLayer links to the layer whose metadata should compile. */
function _getLeafSpatialSource(
  layer: MapLayer.T,
  stack: readonly MapLayer.T[],
): MapLayer.T {
  const byId = makeIdLookupMap(stack);
  const seen = new Set<MapLayer.Id>();
  let current = layer;
  while (current.geoBinding?.type === "bufferOfLayer") {
    if (seen.has(current.id)) {
      return current;
    }
    seen.add(current.id);
    const source = byId.get(current.geoBinding.layerId);
    if (!source) {
      return current;
    }
    current = source;
  }
  return current;
}

/** Compiles, executes, and parses one spatial layer. */
async function _runSpatialLayer(options: {
  layer: MapLayer.T;
  workspaceId: Workspace.Id;
  zoomBand: number;
  simplificationReferenceLatitude: number;
  datasets: readonly Dataset.T[];
  datasetColumns: readonly DatasetColumn.T[];
  overlay: MapOverlay;
  stack: readonly MapLayer.T[];
  signal?: AbortSignal;
}): Promise<MapLayerDataResult> {
  const metadata = getResolvedMapLayerMetadata({
    layer: _getLeafSpatialSource(options.layer, options.stack),
    datasets: options.datasets,
    datasetColumns: options.datasetColumns,
  });
  if (metadata.type === "rebindRequired") {
    throw new Error(`Map geometry requires rebinding: ${metadata.reason}`);
  }
  const plan = compileMapLayerSpatialQuery({ ...options, metadata });
  const queryResult = await WorkspaceQuerySession.runQuery({
    rawSql: plan.rawSql,
    workspaceId: options.workspaceId,
    signal: options.signal,
  });
  return {
    type: "spatial",
    ...parseMapLayerSpatialResult({
      queryResult,
      family: plan.family,
    }),
  };
}

function _getQueryColumnName(
  layer: MapLayer.T,
  columnId: QueryColumn.Id | undefined,
): string | undefined {
  if (!columnId) {
    return undefined;
  }
  const column = layer.source.queryColumns.find(propEq("id", columnId));
  return column === undefined ? undefined : (
      QueryColumn.getDerivedColumnName(column)
    );
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
async function _runLatLngLayer(options: {
  layer: MapLayer.T;
  workspaceId: Workspace.Id;
  overlay: MapOverlay;
  zoomBand: number;
  signal?: AbortSignal;
}): Promise<MapLayerDataResult> {
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

type LayerQueryContext = {
  layers: readonly MapLayer.T[];
  workspaceId: Workspace.Id;
  zoomBand: number;
  simplificationReferenceLatitude: number;
  datasets: readonly Dataset.T[];
  datasetColumns: readonly DatasetColumn.T[];
  overlay: MapOverlay;
  spatialAvailability: string;
};

function _createLayerQuery(
  layer: MapLayer.T,
  context: LayerQueryContext,
): UseQueryOptions<MapLayerDataResult> {
  const needsSpatial = _layerNeedsSpatial(layer, context.overlay);
  const isCapabilityReady =
    !needsSpatial || context.spatialAvailability === "available";
  const isLatLngPointLayer = layer.geoBinding?.type === "latLngColumns";

  return {
    enabled:
      MapLayerData.isQueryable(layer, context.layers) && isCapabilityReady,

    // `context.zoomBand` is read by `_runLatLngLayer` but only enters the key
    // for a lat/lng layer, which is the only binding that reaches it: every
    // other queryable binding is spatial and carries the zoom in
    // `spatialContext` instead. Keying every layer on zoom would refetch fill
    // and line layers on every zoom step for a value they never read.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [
      context.workspaceId,
      ...MapLayerData.getQueryKeyFromMapLayer(
        layer,
        needsSpatial ?
          {
            availability: context.spatialAvailability,
            zoomBand: context.zoomBand,
            simplificationReferenceLatitude:
              context.simplificationReferenceLatitude,
          }
        : undefined,
        context.overlay,
        context.layers,
        isLatLngPointLayer ? { zoomBand: context.zoomBand } : undefined,
      ),
    ],
    // A point layer re-aggregates on every zoom band, so without a placeholder
    // the layer would blank out and refit on each step rather than repaint.
    placeholderData:
      _isSpatialBinding(layer) || isLatLngPointLayer ?
        (previous: MapLayerDataResult | undefined) => {
          return previous;
        }
      : undefined,
    queryFn: async ({ signal }): Promise<MapLayerDataResult> => {
      if (_isSpatialBinding(layer)) {
        return await _runSpatialLayer({
          layer,
          workspaceId: context.workspaceId,
          zoomBand: context.zoomBand,
          simplificationReferenceLatitude:
            context.simplificationReferenceLatitude,
          datasets: context.datasets,
          datasetColumns: context.datasetColumns,
          overlay: context.overlay,
          stack: context.layers,
          signal,
        });
      }
      return await _runLatLngLayer({
        layer,
        workspaceId: context.workspaceId,
        overlay: context.overlay,
        zoomBand: context.zoomBand,
        signal,
      });
    },
  };
}

function _toLayerQueryStateMap(
  layers: readonly MapLayer.T[],
  overlay: MapOverlay,
  spatialAvailability: string,
  results: ReadonlyArray<{
    data: MapLayerDataResult | undefined;
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
    refetch: () => unknown;
  }>,
): Map<MapLayer.Id, MapLayerQueryState> {
  return new Map(
    layers.map((layer, layerIndex) => {
      const result = results[layerIndex];
      return [
        layer.id,
        {
          data: result?.data,
          isLoading:
            _isWaitingForSpatial(layer, overlay, spatialAvailability) ||
            (result?.isLoading ?? false),
          isRefreshing:
            result?.data !== undefined && (result?.isFetching ?? false),
          error:
            _getCapabilityError(layer, overlay, spatialAvailability) ??
            result?.error ??
            undefined,
          refetch: () => {
            void result?.refetch();
          },
        },
      ];
    }),
  );
}

/**
 * Runs the independent structured query for every configured map layer.
 *
 * Reads the Spatial capability but never asks for the extension: `GisApp`
 * calls `useEnsuredSpatialAvailability` on mount, unconditionally and before
 * any layer exists, so by the time a spatial layer can be configured the
 * request is already in flight. Asking again from here would only re-request a
 * memoized promise, and would do it later and for a strict subset of the cases
 * the view root already covers.
 */
export function useMapLayersData({
  layers,
  workspaceId,
  zoom = 0,
  simplificationReferenceLatitude = 0,
  datasets = [],
  datasetColumns = [],
  overlay,
}: {
  layers: readonly MapLayer.T[];
  workspaceId: Workspace.Id;
  zoom?: number;
  simplificationReferenceLatitude?: number;
  datasets?: readonly Dataset.T[];
  datasetColumns?: readonly DatasetColumn.T[];
  overlay: MapOverlay;
}): Map<MapLayer.Id, MapLayerQueryState> {
  const spatialAvailability = useDuckDbSpatialAvailability();
  const zoomBand = Math.max(0, Math.min(24, Math.floor(zoom)));
  const results = useQueries({
    queries: layers.map((layer) => {
      return _createLayerQuery(layer, {
        layers,
        workspaceId,
        zoomBand,
        simplificationReferenceLatitude,
        datasets,
        datasetColumns,
        overlay,
        spatialAvailability,
      });
    }),
  });
  return _toLayerQueryStateMap(layers, overlay, spatialAvailability, results);
}
