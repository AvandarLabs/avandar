import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { DataDictionaryCodeListClient } from "@/clients/dataDictionaries/DataDictionaryCodeListClient";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { invalidateDatasetRowQueries } from "@/views/DataManagerApp/DatasetMetaView/invalidateDatasetRowQueries/invalidateDatasetRowQueries";
import type { QueryClient } from "@tanstack/react-query";

/**
 * Marks stale everything deleting a dictionary changes: the dictionaries
 * and their code lists; the bindings, since the server removes reference
 * bindings and pins convert bindings; the dataset columns those bindings
 * describe; and every query that shows rows, so a converted dataset on view
 * reads its pinned conversions. Called by `DataDictionaryActionsMenu` once
 * a delete succeeds.
 */
export async function invalidateAfterDictionaryDelete(
  queryClient: QueryClient,
): Promise<void> {
  const clients = [
    DataDictionaryClient,
    DataDictionaryCodeListClient,
    DictionaryBindingClient,
    DatasetColumnClient,
  ];
  await Promise.all([
    ...clients.map((client) => {
      return queryClient.invalidateQueries({
        queryKey: [client.getClientName()],
      });
    }),
    invalidateDatasetRowQueries(queryClient),
  ]);
}
