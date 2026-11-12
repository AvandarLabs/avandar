import { makeBucketMap, prop, where } from "@avandar/utils";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** The datasets a new dictionary can learn from, and their columns. */
export type NewDictionarySources = {
  datasets: Dataset.T[];
  columnsByDatasetId: ReadonlyMap<Dataset.Id, DatasetColumn.T[]>;
  isLoading: boolean;
};

/**
 * The workspace's datasets and every dataset's columns, for the create
 * flow's Pick step and for profiling. Both refetch on mount, so a dataset
 * imported a moment ago is listed with its columns.
 */
export function useNewDictionarySources(): NewDictionarySources {
  const workspace = useCurrentWorkspace();
  const [datasets, isLoadingDatasets] = DatasetClient.useGetAll({
    ...where("workspace_id", "eq", workspace.id),
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });
  const [columns, isLoadingColumns] = DatasetColumnClient.useGetAll({
    ...where("workspace_id", "eq", workspace.id),
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });
  const columnsByDatasetId = useMemo(() => {
    return makeBucketMap(columns ?? [], { keyFn: prop("datasetId") });
  }, [columns]);
  return {
    datasets: datasets ?? [],
    columnsByDatasetId,
    isLoading: isLoadingDatasets || isLoadingColumns,
  };
}
