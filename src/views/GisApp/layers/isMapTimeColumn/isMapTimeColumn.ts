import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/**
 * True when a query column can be used as a map layer's time filter. A case
 * type field that keeps every value is a list, which a time filter's
 * comparison fails on.
 */
export function isMapTimeColumn(column: QueryColumn.T): boolean {
  const dataType = column.baseColumn.dataType;
  return (
    !QueryColumn.isList(column) &&
    (dataType === "date" || dataType === "timestamp" || dataType === "varchar")
  );
}
