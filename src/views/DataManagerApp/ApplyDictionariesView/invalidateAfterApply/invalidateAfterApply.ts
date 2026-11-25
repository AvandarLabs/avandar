import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { DataDictionaryCodeListClient } from "@/clients/dataDictionaries/DataDictionaryCodeListClient";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { invalidateDatasetRowQueries } from "@/views/DataManagerApp/DatasetMetaView/invalidateDatasetRowQueries/invalidateDatasetRowQueries";
import type { QueryClient } from "@tanstack/react-query";

/**
 * Marks stale everything a saved apply changes: the bindings; the dataset
 * columns, since a converted column's type changes and a kept original
 * gets its own column; the datasets and virtual datasets, since a linked
 * dataset is new; and every query that shows rows, so screens on view read
 * the new conversions. Adding a value to a code list bumps its dictionary's
 * version, so the dictionaries and code lists are refreshed too when the
 * apply added any.
 */
export async function invalidateAfterApply(
  queryClient: QueryClient,
  options: Readonly<{ hasAddedPairs: boolean }>,
): Promise<void> {
  const clients = [
    DictionaryBindingClient,
    DatasetColumnClient,
    DatasetClient,
    VirtualDatasetClient,
    ...(options.hasAddedPairs
      ? [DataDictionaryClient, DataDictionaryCodeListClient]
      : []),
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
