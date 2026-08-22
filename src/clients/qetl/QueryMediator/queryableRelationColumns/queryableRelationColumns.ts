import type { Dataset } from "$/models/datasets/Dataset/Dataset";

import { normalizeColumns } from "$/models/relations/RelationCacheKey/RelationCacheKey";

const loadedColumnsByDatasetId = new Map<string, readonly string[] | "all">();

/**
 * Records the column set currently loaded into DuckDB for this dataset.
 */
export function rememberQueryableColumns(
  datasetId: Dataset.Id,
  columns: readonly string[] | "all",
): void {
  loadedColumnsByDatasetId.set(datasetId, normalizeColumns(columns));
}

/**
 * Drops the recorded column set for this dataset, if any.
 */
export function forgetQueryableColumns(datasetId: Dataset.Id): void {
  loadedColumnsByDatasetId.delete(datasetId);
}

/**
 * The column set last loaded into DuckDB for this dataset, or `undefined`
 * when this process has not loaded it.
 */
export function getQueryableColumns(
  datasetId: Dataset.Id,
): readonly string[] | "all" | undefined {
  return loadedColumnsByDatasetId.get(datasetId);
}

/**
 * Forgets every recorded queryable column set.
 */
export function clearQueryableRelationColumns(): void {
  loadedColumnsByDatasetId.clear();
}
