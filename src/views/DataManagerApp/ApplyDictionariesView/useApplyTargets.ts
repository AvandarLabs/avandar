import { where } from "@avandar/utils";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useIsUnderDatasetLimit } from "@/hooks/datasets/useIsUnderDatasetLimit/useIsUnderDatasetLimit";
import { useCanCreateDatasets } from "@/hooks/workspaces/useCanCreateDatasets/useCanCreateDatasets";
import { getApplyTargets } from "@/views/DataManagerApp/ApplyDictionariesView/applyTargets/applyTargets";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ApplyTargets } from "@/views/DataManagerApp/ApplyDictionariesView/applyTargets/applyTargets";

/** The dataset's source record fields the targets read. */
function useSourceFacts(dataset: Dataset.T): {
  isLoading: boolean;
  linkedSourceDatasetId: Dataset.Id | undefined;
  isInCloudStorage: boolean | undefined;
} {
  const [source, isLoading] = DatasetClient.useGetSourceDataset({
    datasetId: dataset.id,
    sourceType: dataset.sourceType,
  });
  return {
    isLoading,
    linkedSourceDatasetId:
      source && "linkedSourceDatasetId" in source
        ? source.linkedSourceDatasetId
        : undefined,
    isInCloudStorage:
      source && "isInCloudStorage" in source
        ? source.isInCloudStorage
        : undefined,
  };
}

/**
 * Where this dataset's conversions can be saved, or undefined while what
 * decides it loads: its source record, the linked datasets that read it
 * and the first one's name, who may add datasets, and the plan's dataset
 * limit.
 */
export function useApplyTargets(
  options: Readonly<{
    dataset: Dataset.T;
    existingBindings: readonly DictionaryBinding.T[];
  }>,
): ApplyTargets | undefined {
  const { dataset, existingBindings } = options;
  const source = useSourceFacts(dataset);
  const canCreateDatasets = useCanCreateDatasets();
  const isUnderDatasetLimit = useIsUnderDatasetLimit();
  const [linkedDatasets] = VirtualDatasetClient.useGetAll({
    ...where("linked_source_dataset_id", "eq", dataset.id),
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });
  const firstLinkedDatasetId = linkedDatasets?.[0]?.datasetId;
  const [firstLinkedDataset, isLoadingLinkedName] = DatasetClient.useGetById({
    id: firstLinkedDatasetId,
    useQueryOptions: { enabled: firstLinkedDatasetId !== undefined },
  });
  const isReady =
    !source.isLoading &&
    linkedDatasets !== undefined &&
    (firstLinkedDatasetId === undefined || !isLoadingLinkedName);
  const hasLinkedDatasets = (linkedDatasets?.length ?? 0) > 0;
  const linkedDatasetName = firstLinkedDataset?.name;
  const { linkedSourceDatasetId, isInCloudStorage } = source;
  return useMemo(() => {
    return isReady
      ? getApplyTargets({
          sourceType: dataset.sourceType,
          linkedSourceDatasetId,
          isInCloudStorage,
          canCreateDatasets,
          isUnderDatasetLimit,
          hasLinkedDatasets,
          linkedDatasetName,
          existingBindings,
        })
      : undefined;
  }, [
    isReady,
    dataset.sourceType,
    linkedSourceDatasetId,
    isInCloudStorage,
    canCreateDatasets,
    isUnderDatasetLimit,
    hasLinkedDatasets,
    linkedDatasetName,
    existingBindings,
  ]);
}
