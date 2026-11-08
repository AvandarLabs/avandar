import { Model } from "@avandar/models";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
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
export type ExecutableManualQuery = {
  query: PartialStructuredQuery;
  didAutoLimit: boolean;
  rowCount?: number;
};

/**
 * Gets a dataset's row count, reusing one already fetched in this browser
 * session. Use it to decide whether a manual query needs an automatic LIMIT,
 * for example when the user picks a dataset and the query has no limit.
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
 * Resets each aggregation a list cannot take to `none`, for example a saved
 * sum on a case type field that keeps every value, which compiles to `SUM` of
 * a list and fails in DuckDB. Another column's aggregation is left alone: the
 * form offers a type only some aggregations, but DuckDB runs more, such as the
 * max of a date. Returns the same query when nothing needs a reset.
 */
function _resetUnsupportedAggregations(
  query: PartialStructuredQuery,
): PartialStructuredQuery {
  const unsupportedColumns = query.queryColumns.filter((column) => {
    const aggregation = query.aggregations[column.id];
    return (
      aggregation !== undefined &&
      QueryColumn.isList(column) &&
      !QueryColumn.getValidAggregations(column).includes(aggregation)
    );
  });
  if (unsupportedColumns.length === 0) {
    return query;
  }
  const aggregations = { ...query.aggregations };
  unsupportedColumns.forEach((column) => {
    aggregations[column.id] = "none";
  });
  return { ...query, aggregations };
}

/**
 * Returns the manual query to run, with an automatic LIMIT added when the
 * query would return every row of a dataset larger than
 * {@link LARGE_DATASET_ROW_THRESHOLD}. Use it just before a structured query
 * runs, for example when compiling a workspace query to SQL, so a large
 * dataset is never loaded in full by accident. It also resets an aggregation
 * a list cannot take, such as a sum, to `none`.
 */
export async function makeExecutableQueryFromManualQuery(params: {
  query: PartialStructuredQuery;
  workspaceId: Workspace.Id;
}): Promise<ExecutableManualQuery> {
  const { workspaceId } = params;
  const query = _resetUnsupportedAggregations(params.query);

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
