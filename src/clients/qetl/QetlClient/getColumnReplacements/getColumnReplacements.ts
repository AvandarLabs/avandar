import { isDefined } from "@avandar/utils";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import type { ColumnReplacement } from "@/clients/qetl/QetlClient/QetlClient.types";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/**
 * Works out which columns the dataset's DuckDB view has to project differently
 * from how they are stored.
 *
 * The parquet always keeps the source's own column names and types, so a rename
 * is an alias and a user-chosen type is a `TRY_CAST`, both applied in the view
 * rather than baked into the data. That is what makes both reversible, and
 * it is why a column the user left alone must produce no replacement at all:
 * the stored form is already the wanted form.
 *
 * A cast is driven by `isDataTypeUserSet`, never by comparing `dataType`
 * against `detectedDataType`. Those two also diverge when the background
 * transcode revises `detectedDataType` on a column nobody edited, and
 * casting to the pre-transcode type there would throw away the correction:
 * for XLSX, whose sniff reports every column as `VARCHAR`, it would flatten
 * the whole dataset back to text.
 */
export function getColumnReplacements(
  columns: readonly DatasetColumn.T[],
): ColumnReplacement[] {
  return columns
    .map((column) => {
      const hasChangedName = column.name !== column.originalName;
      const hasChangedDataType = column.isDataTypeUserSet;
      return hasChangedName || hasChangedDataType ?
          {
            originalName: column.originalName,
            alias: hasChangedName ? column.name : undefined,
            dataType:
              hasChangedDataType ?
                DuckDbDataTypeUtils.fromDatasetColumnType(column.dataType)
              : undefined,
          }
        : undefined;
    })
    .filter(isDefined);
}
