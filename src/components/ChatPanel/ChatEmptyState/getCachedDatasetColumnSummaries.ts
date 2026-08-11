import { isDefined, makeMap } from "@avandar/utils";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import type {
  ColumnSummary,
  DatasetSummary,
} from "@/clients/datasets/DatasetQueryClient";
import type { QueryClient } from "@tanstack/react-query";
import type { Workspace } from "$/models/Workspace/Workspace";

type ColumnRef = { name: string; dataType: string };

/**
 * Reads column summaries already in the TanStack Query cache. Never triggers
 * fetches. Uses the full dataset summary when present; otherwise checks
 * per-column summary entries for the given columns only.
 */
export function getCachedDatasetColumnSummaries(
  options: Readonly<{
    queryClient: QueryClient;
    datasetId: Dataset.Id;
    workspaceId: Workspace.Id;
    columns: readonly ColumnRef[];
  }>,
): Map<string, ColumnSummary> {
  const fullSummary = options.queryClient.getQueryData<DatasetSummary>(
    DatasetQueryClient.QueryKeys.getSummary({
      datasetId: options.datasetId,
      workspaceId: options.workspaceId,
    }),
  );
  if (fullSummary?.columnSummaries) {
    return makeMap(fullSummary.columnSummaries, { key: "name" });
  }

  const cachedSummaries = options.columns
    .map((column) => {
      return options.queryClient.getQueryData<ColumnSummary>(
        DatasetQueryClient.QueryKeys.getColumnSummary({
          datasetId: options.datasetId,
          workspaceId: options.workspaceId,
          columnName: column.name,
          dataType: column.dataType,
        }),
      );
    })
    .filter(isDefined);
  return makeMap(cachedSummaries, { key: "name" });
}
