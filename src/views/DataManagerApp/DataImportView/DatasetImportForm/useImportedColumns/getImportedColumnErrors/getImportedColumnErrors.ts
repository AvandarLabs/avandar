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
  const countsByCollisionKey = new Map<string, number>();
  namedColumns.forEach((column) => {
    const key = _toCollisionKey(column.name);
    countsByCollisionKey.set(key, (countsByCollisionKey.get(key) ?? 0) + 1);
  });

  return columns.reduce<ImportedColumnError[]>((errors, column) => {
    if (column.name.trim().length === 0) {
      return errors.concat({
        columnIdx: column.columnIdx,
        columnName: column.name,
        kind: "empty_name",
      });
    }
    const isDuplicate =
      (countsByCollisionKey.get(_toCollisionKey(column.name)) ?? 0) > 1;
    return isDuplicate ?
        errors.concat({
          columnIdx: column.columnIdx,
          columnName: column.name,
          kind: "duplicate_name",
        })
      : errors;
  }, []);
}
