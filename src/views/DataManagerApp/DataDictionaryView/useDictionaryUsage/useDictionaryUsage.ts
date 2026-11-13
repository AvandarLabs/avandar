import { prop, where } from "@avandar/utils";
import { useMemo } from "react";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** One dataset a dictionary is applied to, as the Used by tab lists it. */
export type DictionaryUsageRow = {
  datasetId: Dataset.Id;
  datasetName: string;
  /** How many of the dictionary's entries the dataset's columns use. */
  entryCount: number;
};

/** The datasets a dictionary is applied to, sorted by name. */
export type DictionaryUsage = {
  rows: readonly DictionaryUsageRow[];
  isLoading: boolean;
  /** True when the bindings or their datasets could not be read. */
  hasError: boolean;
};

function _toRows(
  bindings: readonly DictionaryBinding.T[],
  datasets: readonly Dataset.T[],
): DictionaryUsageRow[] {
  return datasets
    .map((dataset) => {
      const entryIds = bindings
        .filter((binding) => {
          return binding.datasetId === dataset.id;
        })
        .map(prop("entryId"));
      return {
        datasetId: dataset.id,
        datasetName: dataset.name,
        entryCount: new Set(entryIds).size,
      };
    })
    .sort((rowA, rowB) => {
      return rowA.datasetName.localeCompare(rowB.datasetName);
    });
}

/**
 * The datasets one dictionary is applied to, that the user can see. A
 * dataset the user cannot read is never counted, because its bindings are
 * hidden with it. Bindings refetch on mount, so an apply made a moment ago
 * is listed. Used by the Dictionary view's header and Used by tab.
 */
export function useDictionaryUsage(
  dictionaryId: DataDictionary.Id,
): DictionaryUsage {
  const [bindings, isLoadingBindings, bindingsQuery] =
    DictionaryBindingClient.useGetAll({
      ...where("dictionary_id", "eq", dictionaryId),
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });
  const datasetIds = useMemo(() => {
    return [...new Set((bindings ?? []).map(prop("datasetId")))];
  }, [bindings]);
  const [datasets, isLoadingDatasets, datasetsQuery] = DatasetClient.useGetAll({
    ...where("id", "in", datasetIds),
    useQueryOptions: { enabled: datasetIds.length > 0 },
  });
  const rows = useMemo(() => {
    return _toRows(
      bindings ?? [],
      datasetIds.length > 0 ? (datasets ?? []) : [],
    );
  }, [bindings, datasets, datasetIds]);
  return {
    rows,
    isLoading: isLoadingBindings || isLoadingDatasets,
    hasError: bindingsQuery.isError || datasetsQuery.isError,
  };
}
