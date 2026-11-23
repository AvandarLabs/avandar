import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { clearCachedDatasetRows } from "@/views/DataManagerApp/DatasetMetaView/clearCachedDatasetRows";
import { invalidateDatasetRowQueries } from "@/views/DataManagerApp/DatasetMetaView/invalidateDatasetRowQueries/invalidateDatasetRowQueries";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { QueryClient } from "@tanstack/react-query";

/** Second element of every map layer data query key. */
const MAP_LAYER_DATA_KEY_MARKER = "mapLayerData";

/**
 * Drops every copy of a places dataset's rows this tab holds, so the map,
 * Data Explorer, and charts re-read the places just written. Called by the
 * place tool after each save or delete, and once per places dataset when a
 * map opens.
 */
export async function refreshPlacesDatasetCaches(
  options: Readonly<{
    queryClient: QueryClient;
    datasetId: Dataset.Id;
    userId: User.Id;
    workspaceId: Workspace.Id;
  }>,
): Promise<void> {
  const { queryClient, datasetId, userId, workspaceId } = options;
  await clearCachedDatasetRows({ datasetId, userId, workspaceId });
  // Removed, not invalidated: QETL reads `raw_sql` with `ensureQueryData`,
  // which serves cached data even after an invalidation.
  queryClient.removeQueries({
    queryKey: [VirtualDatasetClient.getClientName()],
  });
  await invalidateDatasetRowQueries(queryClient);
  await queryClient.invalidateQueries({
    predicate: (query) => {
      return query.queryKey[1] === MAP_LAYER_DATA_KEY_MARKER;
    },
  });
}
