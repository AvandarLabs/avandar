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
export function getCachedDatasetColumnSummaries(params: {
  queryClient: QueryClient;
  datasetId: Dataset.Id;
  workspaceId: Workspace.Id;
  columns: readonly ColumnRef[];
}): Map<string, ColumnSummary> {
  const { queryClient, datasetId, workspaceId, columns } = params;
  const byName = new Map<string, ColumnSummary>();

  const fullSummary = queryClient.getQueryData<DatasetSummary>(
    DatasetQueryClient.QueryKeys.getSummary({ datasetId, workspaceId }),
  );
  if (fullSummary?.columnSummaries) {
    return new Map(
      fullSummary.columnSummaries.map((summary) => {
        return [summary.name, summary];
      }),
    );
  }

  columns.forEach((column) => {
    const cached = queryClient.getQueryData<ColumnSummary>(
      DatasetQueryClient.QueryKeys.getColumnSummary({
        datasetId,
        workspaceId,
        columnName: column.name,
        dataType: column.dataType,
      }),
    );
    if (cached) {
      byName.set(column.name, cached);
    }
  });

  return byName;
}
