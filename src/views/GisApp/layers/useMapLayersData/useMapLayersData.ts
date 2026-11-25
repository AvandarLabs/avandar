import { hashKey, useQueries } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { MapLayerData } from "@/views/GisApp/layers/useMapLayersData/MapLayerData";
import { useDuckDbSpatialAvailability } from "@/views/GisApp/useDuckDbSpatialAvailability";
import { isSpatialMapLayerBinding, runMapLayerQuery } from "./runMapLayerQuery";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DuckDbSpatialAvailability } from "@/clients/DuckDbClient/DuckDbSpatialAvailability/DuckDbSpatialAvailability";
import type { MapOverlay } from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { MapLayerDataResult } from "@/views/GisApp/layers/MapLayerDataResult.types";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { RefObject } from "react";

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

  /** The map's secret key for jittered points. Never published. */
  jitterSalt: string;
};

/** One layer's query, as the map render pipeline needs to see it. */
export type MapLayerQueryState = {
  data: MapLayerDataResult | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | undefined;
  refetch: () => void;
};

/** True when the layer query uses DuckDB Spatial functions. */
function _layerNeedsSpatial(layer: MapLayer.T, overlay: MapOverlay): boolean {
  if (isSpatialMapLayerBinding(layer) || layer.spatialFilter !== undefined) {
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

type LayerQueryContext = {
  layers: readonly MapLayer.T[];
  workspaceId: Workspace.Id;
  zoomBand: number;
  simplificationReferenceLatitude: number;
  datasets: readonly Dataset.T[];
  datasetColumns: readonly DatasetColumn.T[];
  overlay: MapOverlay;
  spatialAvailability: DuckDbSpatialAvailability;
  jitterSalt: string;

  /**
   * The data a layer last resolved to, when it was queried under the same
   * view-free key hash. Undefined once anything but the view has changed.
   */
  getLastData: (
    layerId: MapLayer.Id,
    viewFreeKeyHash: string,
  ) => MapLayerDataResult | undefined;
};

/** A layer's last data and the view-free key hash it was queried under. */
type LastLayerData = {
  data: MapLayerDataResult;
  viewFreeKeyHash: string;
};

/**
 * Hashes a layer's query key without its view contexts, so the hash ignores
 * the zoom band and the simplification latitude but changes with anything
 * else the key holds: the source and its filters, the geo binding, the
 * sensitivity, the time range, the AOI, and the layers it depends on.
 *
 * It also ignores Spatial availability, which sits inside `spatialContext`.
 * That is safe only because the `isEnabled` guard on the placeholder drops a
 * layer's last data once availability changes to "unavailable".
 */
function _makeViewFreeKeyHashFromLayer(
  layer: MapLayer.T,
  context: Pick<LayerQueryContext, "workspaceId" | "overlay" | "layers">,
): string {
  return hashKey([
    context.workspaceId,
    ...MapLayerData.getQueryKeyFromMapLayer(
      layer,
      undefined,
      context.overlay,
      context.layers,
      undefined,
    ),
  ]);
}

/** A layer paired with its view-free key hash for one render. */
type HashedLayer = {
  layer: MapLayer.T;
  viewFreeKeyHash: string;
};

/**
 * Pairs each layer in the context's stack with its view-free key hash.
 *
 * `useMapLayersData` builds this once per render, so `_createLayerQuery` and
 * `_makeLastDataByLayerIdFromResults` see the same hash for each layer.
 */
function _makeHashedLayersFromContext(
  context: Pick<LayerQueryContext, "workspaceId" | "overlay" | "layers">,
): HashedLayer[] {
  return context.layers.map((layer) => {
    return {
      layer,
      viewFreeKeyHash: _makeViewFreeKeyHashFromLayer(layer, context),
    };
  });
}

/** Each layer's current data and key hash, for layers that have any data. */
function _makeLastDataByLayerIdFromResults(
  hashedLayers: readonly HashedLayer[],
  results: readonly LayerQueryResult[],
): Map<MapLayer.Id, LastLayerData> {
  const lastDataByLayerId = new Map<MapLayer.Id, LastLayerData>();
  hashedLayers.forEach(({ layer, viewFreeKeyHash }, layerIndex) => {
    const data = results[layerIndex]?.data;
    if (data !== undefined) {
      lastDataByLayerId.set(layer.id, { data, viewFreeKeyHash });
    }
  });
  return lastDataByLayerId;
}

/**
 * Reads a layer's last data from the ref, only under a matching key hash.
 *
 * TanStack calls `placeholderData` inside `getOptimisticResult`, which runs
 * during render, so this getter reads the ref during render. That is safe:
 * the ref only ever holds data from a committed render, and it is written in
 * an effect, never during render.
 */
function _makeLastDataGetterFromRef(
  lastDataByLayerIdRef: RefObject<ReadonlyMap<MapLayer.Id, LastLayerData>>,
): LayerQueryContext["getLastData"] {
  return (layerId, viewFreeKeyHash) => {
    const lastLayerData = lastDataByLayerIdRef.current.get(layerId);
    return lastLayerData?.viewFreeKeyHash === viewFreeKeyHash
      ? lastLayerData.data
      : undefined;
  };
}

/**
 * Builds the `placeholderData` that `_createLayerQuery` gives a layer's query,
 * so a layer keeps drawing its last data while only its view changes.
 */
function _makePlaceholderDataFromContext(
  layer: MapLayer.T,
  context: Pick<LayerQueryContext, "getLastData">,
  options: { isEnabled: boolean; viewFreeKeyHash: string },
): UseQueryOptions<MapLayerDataResult>["placeholderData"] {
  const isLatLngPointLayer = layer.geoBinding?.type === "latLngColumns";
  // A point layer re-aggregates on every zoom band, so without a placeholder
  // the layer would blank out and refit on each step rather than repaint.
  // `useQueries` gives a layer whose key changed a new observer, so the
  // placeholder's `previous` argument is always empty and the layer's last
  // data comes from `getLastData` instead. It is offered only when the view
  // alone changed: a disabled layer, or one whose filters, sensitivity, or
  // other query inputs changed, must not keep drawing its old features.
  return options.isEnabled &&
    (isSpatialMapLayerBinding(layer) || isLatLngPointLayer)
    ? () => {
        return context.getLastData(layer.id, options.viewFreeKeyHash);
      }
    : undefined;
}

function _createLayerQuery(
  layer: MapLayer.T,
  context: LayerQueryContext,
  viewFreeKeyHash: string,
): UseQueryOptions<MapLayerDataResult> {
  const needsSpatial = _layerNeedsSpatial(layer, context.overlay);
  const isCapabilityReady =
    !needsSpatial || context.spatialAvailability === "available";
  const isLatLngPointLayer = layer.geoBinding?.type === "latLngColumns";
  const isEnabled =
    MapLayerData.isQueryable(layer, context.layers) &&
    isCapabilityReady &&
    MapLayerData.hasReadySourceFilters({
      layer: layer,
      stack: context.layers,
    });

  return {
    enabled: isEnabled,

    // `context.zoomBand` is read by `runLatLngLayer` but only enters the key
    // for a lat/lng layer, which is the only binding that reaches it: every
    // other queryable binding is spatial and carries the zoom in
    // `spatialContext` instead. Keying every layer on zoom would refetch fill
    // and line layers on every zoom step for a value they never read.
    // oxlint-disable-next-line @tanstack/query/exhaustive-deps
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
    placeholderData: _makePlaceholderDataFromContext(layer, context, {
      isEnabled,
      viewFreeKeyHash,
    }),
    queryFn: async ({ signal }): Promise<MapLayerDataResult> => {
      return await runMapLayerQuery({
        layer,
        context: {
          stack: context.layers,
          workspaceId: context.workspaceId,
          zoomBand: context.zoomBand,
          simplificationReferenceLatitude:
            context.simplificationReferenceLatitude,
          datasets: context.datasets,
          datasetColumns: context.datasetColumns,
          overlay: context.overlay,
          jitterSalt: context.jitterSalt,
        },
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
  jitterSalt,
}: UseMapLayersDataOptions): Map<MapLayer.Id, MapLayerQueryState> {
  const spatialAvailability = useDuckDbSpatialAvailability();
  const lastDataByLayerIdRef = useRef<ReadonlyMap<MapLayer.Id, LastLayerData>>(
    new Map(),
  );
  const context = {
    layers,
    workspaceId,
    zoomBand: Math.max(0, Math.min(24, Math.floor(zoom))),
    simplificationReferenceLatitude,
    datasets,
    datasetColumns,
    overlay,
    spatialAvailability,
    jitterSalt,
    // Reads the ref during render: see `_makeLastDataGetterFromRef`.
    getLastData: _makeLastDataGetterFromRef(lastDataByLayerIdRef),
  };
  const hashedLayers = _makeHashedLayersFromContext(context);
  const results = useQueries({
    queries: hashedLayers.map(({ layer, viewFreeKeyHash }) => {
      return _createLayerQuery(layer, context, viewFreeKeyHash);
    }),
  });
  // Runs after every commit: the `useQueries` result is a new array on each
  // render, so it cannot serve as a dependency.
  useEffect(function rememberLastLayerData() {
    lastDataByLayerIdRef.current = _makeLastDataByLayerIdFromResults(
      hashedLayers,
      results,
    );
  });
  return _toLayerQueryStateMap(layers, overlay, spatialAvailability, results);
}
