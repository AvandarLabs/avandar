import { where } from "@avandar/utils";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/**
 * Whether any dictionary is attached to a dataset's columns. Use it to
 * offer an action only to a dataset with no dictionary yet, such as
 * learning a dictionary from it. `hasBindings` is false while loading.
 */
export function useDatasetHasBindings(datasetId: Dataset.Id): {
  hasBindings: boolean;
  isLoading: boolean;
} {
  const [bindings, isLoading] = DictionaryBindingClient.useGetAll({
    ...where("dataset_id", "eq", datasetId),
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });
  return {
    hasBindings: (bindings?.length ?? 0) > 0,
    isLoading: isLoading || bindings === undefined,
  };
}
