import {
  isFreshAt,
  normalizeColumns,
} from "$/models/relations/RelationCacheKey/RelationCacheKey";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const loadedRelationsByDatasetId = new Map<
  string,
  { columns: readonly string[] | "all"; staleAt: number | undefined }
>();

function _remember(
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

function _forget(datasetId: Dataset.Id): void {
  loadedRelationsByDatasetId.delete(datasetId);
}

function _getColumns(
  datasetId: Dataset.Id,
): readonly string[] | "all" | undefined {
  return loadedRelationsByDatasetId.get(datasetId)?.columns;
}

function _isStale(
  options: Readonly<{ datasetId: Dataset.Id; now: number }>,
): boolean {
  const staleAt = loadedRelationsByDatasetId.get(options.datasetId)?.staleAt;
  return !isFreshAt({ staleAt, now: options.now });
}

function _clear(): void {
  loadedRelationsByDatasetId.clear();
}

/**
 * This process's record of each dataset's rows currently loaded into DuckDB:
 * which columns they hold, and when they go stale.
 */
export const QueryableRelationColumns = {
  /**
   * Records the column set currently loaded into DuckDB for this dataset,
   * and the epoch ms from which those rows are stale (`undefined` for rows
   * that never go stale).
   */
  remember: _remember,

  /** Drops the recorded column set for this dataset, if any. */
  forget: _forget,

  /**
   * The column set last loaded into DuckDB for this dataset, or `undefined`
   * when this process has not loaded it.
   */
  getColumns: _getColumns,

  /**
   * Whether the rows loaded into DuckDB for this dataset are stale at `now`,
   * in epoch ms. A relation this process did not record never is.
   */
  isStale: _isStale,

  /** Forgets every recorded queryable column set. */
  clear: _clear,
};
