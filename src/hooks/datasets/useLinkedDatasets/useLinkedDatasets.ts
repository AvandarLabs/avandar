import { prop, where } from "@avandar/utils";
import { useMemo } from "react";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** One linked dataset that reads another dataset. */
export type LinkedDataset = {
  id: Dataset.Id;
  name: string;
  /** The dictionaries its conversions come from. */
  dictionaryIds: ReadonlySet<string>;
};

/** The linked datasets that read one dataset, sorted by name. */
export type LinkedDatasets = {
  linkedDatasets: readonly LinkedDataset[];
  isLoading: boolean;
};

const NO_LINKED_DATASETS: readonly LinkedDataset[] = [];

function _getConvertingDictionaryIds(
  datasetId: Dataset.Id,
  bindings: readonly DictionaryBinding.T[],
): Set<string> {
  return new Set(
    bindings.flatMap((binding) => {
      return binding.datasetId === datasetId &&
        binding.mode === "convert" &&
        binding.dictionaryId !== undefined
        ? [binding.dictionaryId]
        : [];
    }),
  );
}

function _toLinkedDatasets(
  datasets: readonly Dataset.T[],
  bindings: readonly DictionaryBinding.T[],
): LinkedDataset[] {
  return datasets
    .map((dataset) => {
      return {
        id: dataset.id,
        name: dataset.name,
        dictionaryIds: _getConvertingDictionaryIds(dataset.id, bindings),
      };
    })
    .sort((datasetA, datasetB) => {
      return datasetA.name.localeCompare(datasetB.name);
    });
}

/**
 * The linked datasets that read one dataset, that the user can see, each
 * with the dictionaries it converts with. A linked dataset created a
 * moment ago is listed, since the virtual datasets refetch on mount. Used
 * by the dataset's rail and its delete confirmation.
 */
export function useLinkedDatasets(
  datasetId: Dataset.Id | undefined,
): LinkedDatasets {
  const [virtualDatasets, isLoadingVirtual] = VirtualDatasetClient.useGetAll({
    ...where("linked_source_dataset_id", "eq", datasetId),
    useQueryOptions: {
      ...ALWAYS_REFETCH_ON_MOUNT,
      enabled: datasetId !== undefined,
    },
  });
  const linkedIds = useMemo(() => {
    return (virtualDatasets ?? []).map(prop("datasetId"));
  }, [virtualDatasets]);
  const hasLinked = linkedIds.length > 0;
  const [datasets, isLoadingDatasets] = DatasetClient.useGetAll({
    ...where("id", "in", linkedIds),
    useQueryOptions: { enabled: hasLinked },
  });
  const [bindings, isLoadingBindings] = DictionaryBindingClient.useGetAll({
    ...where("dataset_id", "in", linkedIds),
    useQueryOptions: { enabled: hasLinked },
  });
  const linkedDatasets = useMemo(() => {
    return hasLinked
      ? _toLinkedDatasets(datasets ?? [], bindings ?? [])
      : NO_LINKED_DATASETS;
  }, [hasLinked, datasets, bindings]);
  return {
    linkedDatasets,
    isLoading:
      isLoadingVirtual ||
      (hasLinked && (isLoadingDatasets || isLoadingBindings)),
  };
}
