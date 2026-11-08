import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { ConceptRecordValuesClient } from "@/clients/ontology/ConceptRecordValuesClient/ConceptRecordValuesClient";
import { isDataQueryKey } from "@/views/DataExplorerApp/useDataQuery/isDataQueryKey";
import type { QueryClient } from "@tanstack/react-query";

/**
 * Marks every query that shows a dataset's rows stale, so the ones on screen
 * re-run against the rows a refresh just acquired: the dataset page's
 * preview, metadata and column summaries, every data query, and every case
 * type record's field values. A data query's key names its SQL, and a record
 * value's key names its case type, not the datasets either reads, so all of
 * them are marked.
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
    queryClient.invalidateQueries({
      queryKey: [ConceptRecordValuesClient.getClientName()],
    }),
  ]);
}
