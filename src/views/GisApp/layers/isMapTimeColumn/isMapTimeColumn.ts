import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/** True when a query column can be used as a map layer's time filter. */
export function isMapTimeColumn(column: QueryColumn.T): boolean {
  const dataType = column.baseColumn.dataType;
  return (
    dataType === "date" || dataType === "timestamp" || dataType === "varchar"
  );
}
