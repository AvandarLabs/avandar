import { isNonNullish } from "@utils/guards/isNonNullish/isNonNullish";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.types";

/**
 * Re-maps a selection of `QueryColumn`s to canonical instances from the
 * available set, matching by `baseColumn.id` (the stable database primary
 * key) rather than `QueryColumn.id` (a synthetic UUID generated per call).
 *
 * Returns the remapped array when anything changed; returns `undefined`
 * when the selection is already consistent so callers can skip
 * unnecessary state updates.
 *
 * Handles two cases:
 * - Column no longer in available set (data source changed) — dropped.
 * - Column present but created with a different synthetic UUID (e.g.
 *   restored from URL) — remapped to the canonical available instance.
 *
 * @param options.selectedColumns - The currently selected columns.
 * @param options.availableColumns - All columns for the current source.
 * @returns Remapped array, or `undefined` if no change was needed.
 */
export function remapColumnsByBaseId(options: {
  selectedColumns: readonly QueryColumn[];
  availableColumns: readonly QueryColumn[];
}): readonly QueryColumn[] | undefined {
  const { selectedColumns, availableColumns } = options;

  // Index available columns by their stable DB id for O(1) lookup.
  const availableByBaseId = new Map(
    availableColumns.map((col) => {
      return [col.baseColumn.id, col] as const;
    }),
  );

  // Re-map each selected column to the matching available instance.
  // Columns whose base column is no longer in the available set are
  // dropped by `filter(isNonNullish)`.
  const remappedColumns = selectedColumns
    .map((col) => {
      return availableByBaseId.get(col.baseColumn.id);
    })
    .filter(isNonNullish);

  const isChanged =
    remappedColumns.length !== selectedColumns.length ||
    remappedColumns.some((col, index) => {
      const prior = selectedColumns[index];
      return prior === undefined || col.id !== prior.id;
    });

  return isChanged ? remappedColumns : undefined;
}
