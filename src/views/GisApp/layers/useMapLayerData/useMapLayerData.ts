import { useQuery } from "@avandar/query-hooks";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { runStructuredQuery } from "@/clients/queries/runStructuredQuery/runStructuredQuery";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { UseQueryResultTuple } from "@avandar/query-hooks";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.types";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * True when a layer has everything it needs to run: a data source and a geo
 * binding whose columns are present in its query.
 */
export function isMapLayerQueryable(layer: MapLayer.T): boolean {
  return (
    layer.source.dataSource !== undefined &&
    MapLayer.toGeoBinding(layer) !== undefined
  );
}

/**
 * Cache key for a layer's rows. Deliberately excludes symbology, legend, and
 * popup config so restyling a layer repaints from cache instead of refetching.
 */
export function makeQueryKeyFromMapLayer(layer: MapLayer.T): readonly unknown[] {
  return ["mapLayerData", layer.id, layer.source, layer.geoBinding];
}

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
}): UseQueryResultTuple<QueryResult<UnknownRow>> {
  return useQuery({
    enabled: isMapLayerQueryable(layer),
    queryKey: [workspaceId, ...makeQueryKeyFromMapLayer(layer)],
    queryFn: async (): Promise<QueryResult<UnknownRow>> => {
      return await runStructuredQuery({
        auth: "workspace",
        workspaceId,
        query: layer.source,
        rawSql: undefined,
      });
    },
  });
}
