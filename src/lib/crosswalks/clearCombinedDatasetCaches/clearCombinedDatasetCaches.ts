import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { invalidateCrosswalkQueries } from "@/views/DataManagerApp/CrosswalkView/invalidateCrosswalkQueries";
import { clearCachedDatasetRows } from "@/views/DataManagerApp/DatasetMetaView/clearCachedDatasetRows";
import { invalidateDatasetRowQueries } from "@/views/DataManagerApp/DatasetMetaView/invalidateDatasetRowQueries/invalidateDatasetRowQueries";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { QueryClient } from "@tanstack/react-query";

/**
 * Drops every copy of a combined dataset's rows this tab holds after its
 * SQL, columns, or bindings were written: the cached rows and loaded table
 * (a virtual dataset's loaded view is not keyed by its SQL), the virtual
 * dataset records QETL reads the SQL from, and the queries that show the
 * dataset, its columns, its bindings, or any rows. It also marks every
 * crosswalk query stale through `invalidateCrosswalkQueries`, so the
 * crosswalk's new `output_dataset_id` turns the step label into Update
 * combined dataset.
 */
export async function clearCombinedDatasetCaches(
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
  const clients = [DatasetClient, DatasetColumnClient, DictionaryBindingClient];
  await Promise.all([
    ...clients.map((client) => {
      return queryClient.invalidateQueries({
        queryKey: [client.getClientName()],
      });
    }),
    invalidateDatasetRowQueries(queryClient),
    invalidateCrosswalkQueries(queryClient),
  ]);
}
