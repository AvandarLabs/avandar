import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import type { DuckDbColumnSchema } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/**
 * Seeds the editable import-time column list from a schema DuckDB reported.
 *
 * Every file-backed import path (CSV, XLSX, Google Sheets) starts here, so the
 * form, the cast preview, and the insert payload all read one shape. The
 * DuckDB type becomes the original type, the detected type, and the initial
 * queryable type at once, and the queryable type is marked as not user-set so
 * a later re-parse is free to revise it.
 */
export function makeImportedColumnsFromDuckDbSchema(
  columns: readonly DuckDbColumnSchema[],
): DatasetColumn.Imported[] {
  return columns.map((duckDbColumn, columnIndex) => {
    return {
      name: duckDbColumn.column_name,
      originalName: duckDbColumn.column_name,
      originalDataType: duckDbColumn.column_type,
      detectedDataType: duckDbColumn.column_type,
      dataType: DuckDbDataTypeUtils.toAvaDataType(duckDbColumn.column_type),
      isDataTypeUserSet: false,
      columnIdx: columnIndex,
    };
  });
}
