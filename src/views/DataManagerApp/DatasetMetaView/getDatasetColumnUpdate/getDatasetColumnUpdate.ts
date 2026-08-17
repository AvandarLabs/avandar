import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

type GetDatasetColumnUpdateOptions = {
  previousColumn: DatasetColumn.T;
  editedColumn: DatasetColumn.T;
};

/**
 * Works out what to persist after the user edits a saved dataset's column.
 *
 * Returns `undefined` when nothing changed, so an unedited submit does not
 * write a row and invalidate the dataset's DuckDB view for no reason.
 *
 * A type change also records `isDataTypeUserSet`, and clears it again when the
 * user picks the type inference had detected: that flag, not a comparison of
 * `dataType` against `detectedDataType`, is what decides whether query time
 * casts the column, and the two fields are not comparable anyway since one
 * holds an Avandar type and the other a DuckDB type.
 */
export function getDatasetColumnUpdate(
  options: Readonly<GetDatasetColumnUpdateOptions>,
): Partial<DatasetColumn.T> | undefined {
  const { previousColumn, editedColumn } = options;

  const hasNameChange = editedColumn.name !== previousColumn.name;
  const hasDataTypeChange = editedColumn.dataType !== previousColumn.dataType;
  const hasDescriptionChange =
    editedColumn.description !== previousColumn.description;

  if (!hasNameChange && !hasDataTypeChange && !hasDescriptionChange) {
    return undefined;
  }

  return {
    ...(hasNameChange ? { name: editedColumn.name } : {}),
    ...(hasDescriptionChange ?
      { description: editedColumn.description }
    : {}),
    ...(hasDataTypeChange ?
      {
        dataType: editedColumn.dataType,
        isDataTypeUserSet:
          editedColumn.dataType !==
          DuckDbDataTypeUtils.toAvaDataType(editedColumn.detectedDataType),
      }
    : {}),
  };
}
