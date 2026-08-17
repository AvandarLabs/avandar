import { isUndefined } from "@avandar/utils";
import type { DatasetPreviewColumnEdit } from "@/components/DatasetPreviewBlock/DatasetPreviewBlock";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/**
 * The fields of an imported column the user is allowed to change.
 *
 * The same shape the preview block hands back, so the edit the user submits
 * needs no translation on its way into the column list.
 */
export type ImportedColumnEdit = DatasetPreviewColumnEdit;

/** A column's pending edits, keyed by that column's `columnIdx`. */
export type ImportedColumnEditsByColumnIdx = Record<
  number,
  ImportedColumnEdit | undefined
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
  options: Readonly<{
    baseColumns: readonly DatasetColumn.Imported[];
    editsByColumnIdx: Readonly<ImportedColumnEditsByColumnIdx>;
  }>,
): DatasetColumn.Imported[] {
  const { baseColumns, editsByColumnIdx } = options;
  return baseColumns.map((baseColumn) => {
    const edit = editsByColumnIdx[baseColumn.columnIdx];
    if (isUndefined(edit)) {
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
