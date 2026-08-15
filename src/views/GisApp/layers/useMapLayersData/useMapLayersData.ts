import { useQueries } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { compileMapLayerSpatialQuery } from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery";
import { getResolvedMapLayerMetadata } from "@/clients/maps/MapLayerSpatialQuery/getResolvedMapLayerMetadata";
import { parseMapLayerSpatialResult } from "@/clients/maps/MapLayerSpatialQuery/parseMapLayerSpatialResult";
import { WorkspaceQetlClient } from "@/clients/qetl/WorkspaceQetlClient";
import { runStructuredQuery } from "@/clients/queries/runStructuredQuery/runStructuredQuery";
import { MapLayerData } from "@/views/GisApp/layers/useMapLayersData/MapLayerData";
import type { MapLayerDataResult } from "@/views/GisApp/layers/MapLayerDataResult.types";
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

/** Runs the independent structured query for every configured map layer. */
export function useMapLayersData({
  layers,
  workspaceId,
  zoom = 0,
  simplificationReferenceLatitude = 0,
  datasets = [],
  datasetColumns = [],
}: {
  layers: readonly MapLayer.T[];
  workspaceId: Workspace.Id;
  zoom?: number;
  simplificationReferenceLatitude?: number;
  datasets?: readonly Dataset.T[];
  datasetColumns?: readonly DatasetColumn.T[];
}): Map<MapLayer.Id, MapLayerQueryState> {
  const spatialAvailability = useSyncExternalStore(
    (listener) => {
      return DuckDbClient.subscribeSpatialAvailability(listener);
    },
    () => {
      return DuckDbClient.getSpatialAvailability();
    },
    () => {
      return DuckDbClient.getSpatialAvailability();
    },
  );
  const zoomBand = Math.max(0, Math.min(24, Math.floor(zoom)));
  const hasSpatialLayer = layers.some((layer) => {
    return (
      layer.geoBinding !== undefined &&
      layer.geoBinding.type !== "latLngColumns"
    );
  });
  useEffect(() => {
    if (hasSpatialLayer && spatialAvailability === "loading") {
      void DuckDbClient.initialize().catch(() => {
        return undefined;
      });
    }
  }, [hasSpatialLayer, spatialAvailability]);
  const results = useQueries({
    queries: layers.map((layer) => {
      const isSpatial =
        layer.geoBinding !== undefined &&
        layer.geoBinding.type !== "latLngColumns";
      const isCapabilityReady =
        !isSpatial || spatialAvailability === "available";
      return {
        enabled: MapLayerData.isQueryable(layer) && isCapabilityReady,
        queryKey: [
          workspaceId,
          ...MapLayerData.toQueryKey(
            layer,
            isSpatial ?
              {
                availability: spatialAvailability,
                zoomBand,
                simplificationReferenceLatitude,
              }
            : undefined,
          ),
        ],
        placeholderData:
          isSpatial ?
            (previous: MapLayerDataResult | undefined) => {
              return previous;
            }
          : undefined,
        queryFn: async ({ signal }): Promise<MapLayerDataResult> => {
          if (isSpatial) {
            return await _runSpatialLayer({
              layer,
              workspaceId,
              zoomBand,
              simplificationReferenceLatitude,
              datasets,
              datasetColumns,
              signal,
            });
          }
          return await runStructuredQuery({
            auth: "workspace",
            workspaceId,
            query: layer.source,
            rawSql: undefined,
          }).then((queryResult) => {
            return { type: "rows", queryResult };
          });
        },
      };
    }),
  });

  return new Map(
    layers.map((layer, layerIndex) => {
      const result = results[layerIndex];
      return [
        layer.id,
        {
          data: result?.data,
          isLoading:
            _isWaitingForSpatial(layer, spatialAvailability) ||
            (result?.isLoading ?? false),
          isRefreshing:
            result?.data !== undefined && (result?.isFetching ?? false),
          error:
            _getCapabilityError(layer, spatialAvailability) ??
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

/** True while a configured spatial layer waits for capability detection. */
function _isWaitingForSpatial(
  layer: MapLayer.T,
  availability: string,
): boolean {
  return (
    layer.geoBinding !== undefined &&
    layer.geoBinding.type !== "latLngColumns" &&
    availability === "loading"
  );
}

/** Returns a local capability error before any QETL request is attempted. */
function _getCapabilityError(
  layer: MapLayer.T,
  availability: string,
): Error | undefined {
  return (
      layer.geoBinding !== undefined &&
        layer.geoBinding.type !== "latLngColumns" &&
        availability === "unavailable"
    ) ?
      new Error("DuckDB Spatial is unavailable for this geometry layer")
    : undefined;
}

/** Compiles, executes, and parses one spatial layer. */
async function _runSpatialLayer(options: {
  layer: MapLayer.T;
  workspaceId: Workspace.Id;
  zoomBand: number;
  simplificationReferenceLatitude: number;
  datasets: readonly Dataset.T[];
  datasetColumns: readonly DatasetColumn.T[];
  signal?: AbortSignal;
}): Promise<MapLayerDataResult> {
  const metadata = getResolvedMapLayerMetadata({
    layer: options.layer,
    datasets: options.datasets,
    datasetColumns: options.datasetColumns,
  });
  if (metadata.type === "rebindRequired") {
    throw new Error(`Map geometry requires rebinding: ${metadata.reason}`);
  }
  const plan = compileMapLayerSpatialQuery({ ...options, metadata });
  const queryResult = await WorkspaceQetlClient.runQuery({
    rawSql: plan.rawSql,
    workspaceId: options.workspaceId,
    signal: options.signal,
  });
  return {
    type: "spatial",
    ...parseMapLayerSpatialResult(queryResult, plan.family),
  };
}
