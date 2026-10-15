import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { DuckDbColumnSchema } from "@/clients/DuckDbClient/DuckDbClient.types";

/** Converts DuckDB's column schema into the shape a dataset insert expects. */
export function duckDbColumnsToImportedColumns(
  columns: readonly DuckDbColumnSchema[],
): DatasetColumn.Imported[] {
  return columns.map((duckDbColumn, columnIndex) => {
    return {
      name: duckDbColumn.column_name,
      originalName: duckDbColumn.column_name,
      originalDataType: duckDbColumn.column_type,
      detectedDataType: duckDbColumn.column_type,
      dataType: DuckDbDataTypeUtils.toAvaDataType(duckDbColumn.column_type),
      columnIdx: columnIndex,
    };
  });
}
