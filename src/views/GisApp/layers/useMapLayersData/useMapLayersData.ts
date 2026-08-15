import { useQueries } from "@tanstack/react-query";
import { runStructuredQuery } from "@/clients/queries/runStructuredQuery/runStructuredQuery";
import { MapLayerData } from "@/views/GisApp/layers/useMapLayersData/MapLayerData";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";

/** One layer's query, as the map render pipeline needs to see it. */
export type MapLayerQueryState = {
  queryResult: QueryResult.T<UnknownRow> | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
};

/** Runs the independent structured query for every configured map layer. */
export function useMapLayersData({
  layers,
  workspaceId,
}: {
  layers: readonly MapLayer.T[];
  workspaceId: Workspace.Id;
}): ReadonlyMap<MapLayer.Id, MapLayerQueryState> {
  const results = useQueries({
    queries: layers.map((layer) => {
      return {
        enabled: MapLayerData.isQueryable(layer),
        queryKey: [workspaceId, ...MapLayerData.makeQueryKey(layer)],
        queryFn: async (): Promise<QueryResult.T<UnknownRow>> => {
          return await runStructuredQuery({
            auth: "workspace",
            workspaceId,
            query: layer.source,
            rawSql: undefined,
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
          queryResult: result?.data,
          isLoading: result?.isLoading ?? false,
          error: result?.error ?? undefined,
          refetch: () => {
            void result?.refetch();
          },
        },
      ];
    }),
  );
}
