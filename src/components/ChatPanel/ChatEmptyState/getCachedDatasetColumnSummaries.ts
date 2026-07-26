import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import type {
  ColumnSummary,
  DatasetSummary,
} from "@/clients/datasets/DatasetQueryClient";
import type { QueryClient } from "@tanstack/react-query";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { Workspace } from "$/models/Workspace/Workspace";

type ColumnRef = { name: string; dataType: string };

/**
 * Reads column summaries already in the TanStack Query cache. Never triggers
 * fetches. Uses the full dataset summary when present; otherwise checks
 * per-column summary entries for the given columns only.
 */
export function getCachedDatasetColumnSummaries(params: {
  queryClient: QueryClient;
  datasetId: DatasetId;
  workspaceId: Workspace.Id;
  columns: readonly ColumnRef[];
}): Map<string, ColumnSummary> {
  const { queryClient, datasetId, workspaceId, columns } = params;
  const byName = new Map<string, ColumnSummary>();

  const fullSummary = queryClient.getQueryData<DatasetSummary>(
    DatasetQueryClient.QueryKeys.getSummary({ datasetId, workspaceId }),
  );
  if (fullSummary?.columnSummaries) {
    for (const summary of fullSummary.columnSummaries) {
      byName.set(summary.name, summary);
    }
    return byName;
  }

  for (const column of columns) {
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
  }

  return byName;
}
