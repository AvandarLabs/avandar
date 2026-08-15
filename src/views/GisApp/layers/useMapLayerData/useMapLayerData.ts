import { useQuery } from "@avandar/query-hooks";
import { runStructuredQuery } from "@/clients/queries/runStructuredQuery/runStructuredQuery";
import { MapLayerData } from "@/views/GisApp/layers/useMapLayerData/MapLayerData";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { UseQueryResultTuple } from "@avandar/query-hooks";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Loads one layer's rows through the shared structured-query executor.
 *
 * Any source the executor understands works here, so dataset, virtual, and
 * entity sources all render without map-specific handling.
 */
export function useMapLayerData({
  layer,
  workspaceId,
}: {
  layer: MapLayer.T;
  workspaceId: Workspace.Id;
}): UseQueryResultTuple<QueryResult.T<UnknownRow>> {
  return useQuery({
    enabled: MapLayerData.isQueryable(layer),
    queryKey: [workspaceId, ...MapLayerData.makeQueryKeyFromLayer(layer)],
    queryFn: async (): Promise<QueryResult.T<UnknownRow>> => {
      return await runStructuredQuery({
        auth: "workspace",
        workspaceId,
        query: layer.source,
        rawSql: undefined,
      });
    },
  });
}
