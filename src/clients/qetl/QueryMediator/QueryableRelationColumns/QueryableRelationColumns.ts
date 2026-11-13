import {
  isFreshAt,
  normalizeColumns,
} from "$/models/relations/RelationCacheKey/RelationCacheKey";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const loadedRelationsByDatasetId = new Map<
  string,
  {
    columns: readonly string[] | "all";
    staleAt: number | undefined;
    projectionKey: string | undefined;
  }
>();

function _remember(
  options: Readonly<{
    datasetId: Dataset.Id;
    columns: readonly string[] | "all";
    staleAt: number | undefined;
    projectionKey?: string;
  }>,
): void {
  loadedRelationsByDatasetId.set(options.datasetId, {
    columns: normalizeColumns(options.columns),
    staleAt: options.staleAt,
    projectionKey: options.projectionKey,
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

function _isProjectionCurrent(
  options: Readonly<{ datasetId: Dataset.Id; projectionKey: string }>,
): boolean {
  const recordedKey = loadedRelationsByDatasetId.get(
    options.datasetId,
  )?.projectionKey;
  return recordedKey === undefined || recordedKey === options.projectionKey;
}

function _clear(): void {
  loadedRelationsByDatasetId.clear();
}

/**
 * This process's record of each dataset's rows currently loaded into DuckDB:
 * which columns they hold, when they go stale, and which projection their
 * view was built with.
 */
export const QueryableRelationColumns = {
  /**
   * Records the column set currently loaded into DuckDB for this dataset,
   * the epoch ms from which those rows are stale (`undefined` for rows that
   * never go stale), and the projection key its view was built with
   * (`undefined` for a `stored` session's load, which has no projection).
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

  /**
   * Whether this dataset's view was built with `projectionKey`. A view this
   * process did not record, or recorded without a key, is current, so a
   * table loaded outside this recorder still hits.
   */
  isProjectionCurrent: _isProjectionCurrent,

  /** Forgets every recorded queryable column set. */
  clear: _clear,
};
