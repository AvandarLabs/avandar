import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/**
 * The id the layer inspector uses for a column picked in a column select.
 * A column select builds its own query columns, with ids of its own, so a
 * picked column is matched to the inspector's source column on the dataset
 * column it wraps. A point binding only resolves when its ids are the ones
 * `withPointAggregation` finds among the source columns.
 *
 * @param options.sourceColumns The inspector's columns for the layer source.
 * @param options.pickedColumn The column the select returned.
 * @returns The matching source column's id, or the picked column's own id
 *   when no source column wraps the same dataset column.
 */
export function findSourceColumnId(
  options: Readonly<{
    sourceColumns: readonly QueryColumn.T[];
    pickedColumn: QueryColumn.T;
  }>,
): QueryColumn.Id {
  const { sourceColumns, pickedColumn } = options;
  const sourceColumn = sourceColumns.find((column) => {
    return column.baseColumn.id === pickedColumn.baseColumn.id;
  });
  return sourceColumn?.id ?? pickedColumn.id;
}
