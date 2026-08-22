import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

import { where } from "@avandar/utils";

import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";

/** One workspace dataset and the columns available for boundary roles. */
export type BoundarySourceOption = {
  dataset: Dataset.T;
  label: string;
  columns: readonly DatasetColumn.T[];
};

/** Loads workspace boundary-source choices grouped by dataset. */
export function useBoundarySourceOptions(
  workspaceId: Workspace.Id | undefined,
): {
  options: readonly BoundarySourceOption[];
  isLoading: boolean;
} {
  const [datasets = [], isLoadingDatasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspaceId),
  );
  const [columns = [], isLoadingColumns] = DatasetColumnClient.useGetAll(
    where("workspace_id", "eq", workspaceId),
  );
  const options = datasets
    .filter((dataset) => {
      return workspaceId !== undefined && dataset.workspaceId === workspaceId;
    })
    .map((dataset) => {
      return {
        dataset,
        label: dataset.name,
        columns: columns.filter((column) => {
          return column.datasetId === dataset.id;
        }),
      };
    })
    .filter(({ columns: datasetColumns }) => {
      return datasetColumns.length > 0;
    });
  return {
    options,
    isLoading: isLoadingDatasets || isLoadingColumns,
  };
}
