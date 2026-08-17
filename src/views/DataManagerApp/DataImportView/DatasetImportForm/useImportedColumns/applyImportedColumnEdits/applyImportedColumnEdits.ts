import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** The fields of an imported column the user is allowed to change. */
export type ImportedColumnEdit = {
  name?: string;
  dataType?: AvaDataType.T;
  description?: string;
};

/** A column's pending edits, keyed by that column's `columnIdx`. */
export type ImportedColumnEditsByColumnIdx = Readonly<
  Record<number, ImportedColumnEdit | undefined>
>;

/**
 * Layers the user's import-form edits over the columns inference produced.
 *
 * Kept separate from the inferred list rather than mutating it, so re-running
 * inference (a re-parse with a different delimiter or sheet) cannot be confused
 * with a user's choice, and so `isDataTypeUserSet` can be recomputed rather
 * than remembered. A type edited away from the inferred type and then back to
 * it stops counting as user-set, which is what keeps the dataset's view free of
 * a `TRY_CAST` that would do nothing.
 */
export function applyImportedColumnEdits(
  baseColumns: readonly DatasetColumn.Imported[],
  editsByColumnIdx: ImportedColumnEditsByColumnIdx,
): DatasetColumn.Imported[] {
  return baseColumns.map((baseColumn) => {
    const edit = editsByColumnIdx[baseColumn.columnIdx];
    if (!edit) {
      return baseColumn;
    }
    const dataType = edit.dataType ?? baseColumn.dataType;
    return {
      ...baseColumn,
      name: edit.name ?? baseColumn.name,
      description: edit.description ?? baseColumn.description,
      dataType,
      isDataTypeUserSet: dataType !== baseColumn.dataType,
    };
  });
}
