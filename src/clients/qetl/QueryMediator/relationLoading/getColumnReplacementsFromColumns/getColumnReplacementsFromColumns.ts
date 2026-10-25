import { isDefined } from "@avandar/utils";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ColumnReplacement } from "@/clients/qetl/QueryMediator/QueryMediator.types";

/**
 * The renames and casts that turn a relation's loaded columns into the
 * columns its dataset stores: a column whose stored name differs from its
 * original one is aliased, and a column whose stored type differs from the
 * type it loaded as is cast. A `source-schema` relation loads every column
 * as text, so each of its non-text columns is cast to the type its schema
 * declared.
 *
 * @returns One replacement for each column that needs one.
 */
export function getColumnReplacementsFromColumns(
  columns: readonly DatasetColumn.T[],
): ColumnReplacement[] {
  return columns
    .map((column) => {
      const hasChangedName = column.name !== column.originalName;
      const hasChangedDataType =
        column.dataType !==
        DuckDbDataTypeUtils.toAvaDataType(column.detectedDataType);
      return hasChangedName || hasChangedDataType
        ? {
            originalName: column.originalName,
            alias: hasChangedName ? column.name : undefined,
            dataType: hasChangedDataType
              ? DuckDbDataTypeUtils.fromDatasetColumnType(column.dataType)
              : undefined,
          }
        : undefined;
    })
    .filter(isDefined);
}
