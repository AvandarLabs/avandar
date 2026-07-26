import { Model } from "@models";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import {
  getCachedDatasetRowCount,
  setCachedDatasetRowCount,
} from "@/views/DataExplorerApp/datasetRowCountCache";
import {
  largeDatasetAutoLimitFromRowCount,
  shouldAutoLimitLargeDataset,
} from "@/views/DataExplorerApp/manualQueryLimit/manualQueryLimit";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Passed to `setDataSource` so limit and source commit atomically. */
export type DataSourceCommitOptions = {
  limit?: number;
};

/**
 * Resolved manual query ready to run: the (possibly limit-adjusted) query,
 * whether an automatic LIMIT was applied for a large dataset, and the dataset
 * row count when it was fetched.
 */
export type ResolveManualQueryForExecutionResult = {
  query: PartialStructuredQuery;
  didAutoLimit: boolean;
  rowCount?: number;
};

/**
 * Fetches (or reads from cache) the row count for a dataset table.
 */
export async function fetchDatasetRowCount(params: {
  datasetId: DatasetId;
  workspaceId: Workspace.Id;
}): Promise<number> {
  const cached = getCachedDatasetRowCount(params.datasetId);
  if (cached !== undefined) {
    return cached;
  }

  const meta = await DatasetQueryClient.getDatasetMeta({
    datasetId: params.datasetId,
    workspaceId: params.workspaceId,
  });
  setCachedDatasetRowCount(params.datasetId, meta.rows);
  return meta.rows;
}

/**
 * When the manual query can return unbounded rows, COUNT first and apply an
 * auto LIMIT when the dataset exceeds {@link LARGE_DATASET_ROW_THRESHOLD}.
 */
export async function resolveManualQueryForExecution(params: {
  query: PartialStructuredQuery;
  workspaceId: Workspace.Id;
}): Promise<ResolveManualQueryForExecutionResult> {
  const { query, workspaceId } = params;

  if (!shouldAutoLimitLargeDataset(query)) {
    return { query, didAutoLimit: false };
  }

  const dataSource = query.dataSource;
  if (dataSource === undefined || !Model.isOfModelType(dataSource, "Dataset")) {
    return { query, didAutoLimit: false };
  }

  const rowCount = await fetchDatasetRowCount({
    datasetId: dataSource.id,
    workspaceId,
  });
  const autoLimit = largeDatasetAutoLimitFromRowCount(rowCount);
  if (autoLimit === undefined) {
    return { query, didAutoLimit: false, rowCount };
  }

  return {
    query: { ...query, limit: autoLimit },
    didAutoLimit: true,
    rowCount,
  };
}

/**
 * Options for {@link DataExplorerStateManager.setDataSource} after a row-count
 * check when hydrating or picking a dataset in the manual form.
 */
export async function buildDataSourceCommitOptions(params: {
  dataSource: QueryDataSource;
  query: PartialStructuredQuery;
  workspaceId: Workspace.Id;
}): Promise<DataSourceCommitOptions | undefined> {
  const probeQuery = { ...params.query, dataSource: params.dataSource };
  if (!shouldAutoLimitLargeDataset(probeQuery)) {
    return undefined;
  }
  if (!Model.isOfModelType(params.dataSource, "Dataset")) {
    return undefined;
  }

  const rowCount = await fetchDatasetRowCount({
    datasetId: params.dataSource.id,
    workspaceId: params.workspaceId,
  });
  const limit = largeDatasetAutoLimitFromRowCount(rowCount);
  return limit !== undefined ? { limit } : undefined;
}
