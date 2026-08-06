import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

const rowCountByDatasetId = new Map<DatasetId, number>();

/**
 * Returns a cached row count for a dataset, if one was recorded earlier in
 * this browser session.
 */
export function getCachedDatasetRowCount(
  datasetId: DatasetId,
): number | undefined {
  return rowCountByDatasetId.get(datasetId);
}

/** Stores a row count for later manual-query guard checks. */
export function setCachedDatasetRowCount(
  datasetId: DatasetId,
  rowCount: number,
): void {
  rowCountByDatasetId.set(datasetId, rowCount);
}

/** Clears cached row counts (for tests). */
export function clearDatasetRowCountCache(): void {
  rowCountByDatasetId.clear();
}
