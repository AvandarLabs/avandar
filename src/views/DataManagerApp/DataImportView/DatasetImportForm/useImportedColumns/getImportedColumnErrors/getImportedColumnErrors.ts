import { isDefined, makeBucketMap } from "@avandar/utils";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** What is wrong with one edited column name. */
export type ImportedColumnError = {
  columnIdx: number;
  columnName: string;
  kind: "empty_name" | "duplicate_name";
};

/**
 * Normalizes a column name to the form DuckDB will collide on: trimmed and
 * case-folded, because DuckDB resolves identifiers case-insensitively even when
 * they are quoted.
 */
function _toCollisionKey(columnName: string): string {
  return columnName.trim().toLowerCase();
}

/**
 * Finds the column names that would break the dataset's DuckDB view, so the
 * import form can block saving before they are persisted.
 *
 * Both problems it reports are ones DuckDB will not report itself. An empty
 * name is a parser error at view-creation time, long after the import form has
 * moved on. A duplicate name does not error at all: DuckDB silently renames the
 * second one to `name_1` in `SELECT *` and returns only the first for a lookup
 * by name, so a column quietly becomes unreadable and queries against it return
 * another column's values.
 */
export function getImportedColumnErrors(
  columns: readonly DatasetColumn.Imported[],
): ImportedColumnError[] {
  const namedColumns = columns.filter((column) => {
    return column.name.trim().length > 0;
  });
  // Keyed by a Map rather than a record: the keys are user-supplied column
  // names, and a column named `__proto__` would not survive a plain object.
  const columnsByCollisionKey = makeBucketMap(namedColumns, {
    keyFn: (column) => {
      return _toCollisionKey(column.name);
    },
    valueKey: "columnIdx",
  });

  return columns
    .map((column) => {
      const isEmptyName = column.name.trim().length === 0;
      const isDuplicateName =
        (columnsByCollisionKey.get(_toCollisionKey(column.name))?.length ?? 0) >
        1;
      return (
        isEmptyName ?
          {
            columnIdx: column.columnIdx,
            columnName: column.name,
            kind: "empty_name" as const,
          }
        : isDuplicateName ?
          {
            columnIdx: column.columnIdx,
            columnName: column.name,
            kind: "duplicate_name" as const,
          }
        : undefined
      );
    })
    .filter(isDefined);
}
