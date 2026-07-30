import { isDefined, makeMap } from "@utils";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import type {
  ColumnSummary,
  DatasetSummary,
} from "@/clients/datasets/DatasetQueryClient";
import type { QueryClient } from "@tanstack/react-query";
import type { Workspace } from "$/models/Workspace/Workspace";

type ColumnRef = { name: string; dataType: string };

/** Returns cached column summaries without triggering a fetch. */
export function getCachedDatasetColumnSummaries(
  parameters: Readonly<{
    queryClient: QueryClient;
    datasetId: Dataset.Id;
    workspaceId: Workspace.Id;
    columns: readonly ColumnRef[];
  }>,
): Map<string, ColumnSummary> {
  const { queryClient, datasetId, workspaceId, columns } = parameters;

  const fullSummary = queryClient.getQueryData<DatasetSummary>(
    DatasetQueryClient.QueryKeys.getSummary({ datasetId, workspaceId }),
  );
  if (fullSummary?.columnSummaries) {
    return makeMap(fullSummary.columnSummaries, { key: "name" });
  }

  const cachedSummaries = columns
    .map((column) => {
      return queryClient.getQueryData<ColumnSummary>(
        DatasetQueryClient.QueryKeys.getColumnSummary({
          datasetId,
          workspaceId,
          columnName: column.name,
          dataType: column.dataType,
        }),
      );
    })
    .filter(isDefined);

  return makeMap(cachedSummaries, { key: "name" });
}
