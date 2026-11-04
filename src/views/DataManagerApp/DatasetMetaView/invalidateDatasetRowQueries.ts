import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { isDataQueryKey } from "@/views/DataExplorerApp/useDataQuery/isDataQueryKey";
import type { QueryClient } from "@tanstack/react-query";

/**
 * Marks every query that shows a dataset's rows stale, so the ones on screen
 * re-run against the rows a refresh just acquired: the dataset page's
 * preview, metadata and column summaries, and every data query. A data
 * query's key names its SQL, not the datasets the SQL reads, so all of them
 * are marked.
 */
export async function invalidateDatasetRowQueries(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: [DatasetQueryClient.getClientName()],
    }),
    queryClient.invalidateQueries({
      predicate: (query) => {
        return isDataQueryKey(query.queryKey);
      },
    }),
  ]);
}
