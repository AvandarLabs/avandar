import { makeIdLookupMap } from "@avandar/utils";
import { useQueries } from "@tanstack/react-query";
import { compileMapLayerSpatialQuery } from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery";
import { getResolvedMapLayerMetadata } from "@/clients/maps/MapLayerSpatialQuery/getResolvedMapLayerMetadata/getResolvedMapLayerMetadata";
import { parseMapLayerSpatialResult } from "@/clients/maps/MapLayerSpatialQuery/parseMapLayerSpatialResult/parseMapLayerSpatialResult";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { MapLayerData } from "@/views/GisApp/layers/useMapLayersData/MapLayerData";
import { useDuckDbSpatialAvailability } from "@/views/GisApp/useDuckDbSpatialAvailability";
import { runLatLngLayer } from "./runLatLngLayer";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DuckDbSpatialAvailability } from "@/clients/DuckDbClient/DuckDbSpatialAvailability/DuckDbSpatialAvailability";
import type { MapOverlay } from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { MapLayerDataResult } from "@/views/GisApp/layers/MapLayerDataResult.types";
import type { UseQueryOptions } from "@tanstack/react-query";

type RunSpatialLayerOptions = {
  layer: MapLayer.T;
  workspaceId: Workspace.Id;
  zoomBand: number;
  simplificationReferenceLatitude: number;
  datasets: readonly Dataset.T[];
  datasetColumns: readonly DatasetColumn.T[];
  overlay: MapOverlay;
  stack: readonly MapLayer.T[];
  signal?: AbortSignal;
};

type LayerQueryResult = {
  data: MapLayerDataResult | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => unknown;
};

type UseMapLayersDataOptions = {
  layers: readonly MapLayer.T[];
  workspaceId: Workspace.Id;
  zoom?: number;
  simplificationReferenceLatitude?: number;
  datasets?: readonly Dataset.T[];
  datasetColumns?: readonly DatasetColumn.T[];
  overlay: MapOverlay;
};

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
  availability: DuckDbSpatialAvailability,
): boolean {
  return _layerNeedsSpatial(layer, overlay) && availability === "loading";
}

/** Returns a local capability error before any QETL request is attempted. */
function _getCapabilityError(
  layer: MapLayer.T,
  overlay: MapOverlay,
  availability: DuckDbSpatialAvailability,
): Error | undefined {
  return _layerNeedsSpatial(layer, overlay) && availability === "unavailable"
    ? new Error("DuckDB Spatial is unavailable for this geometry layer")
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
async function _runSpatialLayer(
  options: RunSpatialLayerOptions,
): Promise<MapLayerDataResult> {
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

type LayerQueryContext = {
  layers: readonly MapLayer.T[];
  workspaceId: Workspace.Id;
  zoomBand: number;
  simplificationReferenceLatitude: number;
  datasets: readonly Dataset.T[];
  datasetColumns: readonly DatasetColumn.T[];
  overlay: MapOverlay;
  spatialAvailability: DuckDbSpatialAvailability;
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
      MapLayerData.isQueryable(layer, context.layers) &&
      isCapabilityReady &&
      MapLayerData.hasReadySourceFilters({
        layer: layer,
        stack: context.layers,
      }),

    // `context.zoomBand` is read by `runLatLngLayer` but only enters the key
    // for a lat/lng layer, which is the only binding that reaches it: every
    // other queryable binding is spatial and carries the zoom in
    // `spatialContext` instead. Keying every layer on zoom would refetch fill
    // and line layers on every zoom step for a value they never read.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [
      context.workspaceId,
      ...MapLayerData.getQueryKeyFromMapLayer(
        layer,
        needsSpatial
          ? {
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
      _isSpatialBinding(layer) || isLatLngPointLayer
        ? (previous: MapLayerDataResult | undefined) => {
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
      return await runLatLngLayer({
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
  spatialAvailability: DuckDbSpatialAvailability,
  results: readonly LayerQueryResult[],
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
 * Reads the Spatial capability but assumes the extension is already
 * available.
 */
export function useMapLayersData({
  layers,
  workspaceId,
  zoom = 0,
  simplificationReferenceLatitude = 0,
  datasets = [],
  datasetColumns = [],
  overlay,
}: UseMapLayersDataOptions): Map<MapLayer.Id, MapLayerQueryState> {
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
