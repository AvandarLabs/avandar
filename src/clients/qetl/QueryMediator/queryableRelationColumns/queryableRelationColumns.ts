import {
  isFreshAt,
  normalizeColumns,
} from "$/models/relations/RelationCacheKey/RelationCacheKey";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const loadedRelationsByDatasetId = new Map<
  string,
  { columns: readonly string[] | "all"; staleAt: number | undefined }
>();

/**
 * Records the column set currently loaded into DuckDB for this dataset, and
 * the epoch ms from which those rows are stale (`undefined` for rows that
 * never go stale).
 */
export function rememberQueryableColumns(
  options: Readonly<{
    datasetId: Dataset.Id;
    columns: readonly string[] | "all";
    staleAt: number | undefined;
  }>,
): void {
  loadedRelationsByDatasetId.set(options.datasetId, {
    columns: normalizeColumns(options.columns),
    staleAt: options.staleAt,
  });
}

/**
 * Drops the recorded column set for this dataset, if any.
 */
export function forgetQueryableColumns(datasetId: Dataset.Id): void {
  loadedRelationsByDatasetId.delete(datasetId);
}

/**
 * The column set last loaded into DuckDB for this dataset, or `undefined`
 * when this process has not loaded it.
 */
export function getQueryableColumns(
  datasetId: Dataset.Id,
): readonly string[] | "all" | undefined {
  return loadedRelationsByDatasetId.get(datasetId)?.columns;
}

/**
 * Whether the rows loaded into DuckDB for this dataset are stale at `now`,
 * in epoch ms. A relation this process did not record never is.
 */
export function isQueryableRelationStale(
  datasetId: Dataset.Id,
  now: number,
): boolean {
  const staleAt = loadedRelationsByDatasetId.get(datasetId)?.staleAt;
  return !isFreshAt(staleAt, now);
}

/**
 * Forgets every recorded queryable column set.
 */
export function clearQueryableRelationColumns(): void {
  loadedRelationsByDatasetId.clear();
}
