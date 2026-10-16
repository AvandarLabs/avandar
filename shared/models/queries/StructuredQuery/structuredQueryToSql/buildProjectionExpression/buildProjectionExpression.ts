import { quoteSqlIdentifier } from "@utils/sql/index.ts";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

/** Builds the typed SQL expression shared by SELECT and HAVING. */
export function buildProjectionExpression(
  column: QueryColumn.T,
  aggregation: QueryAggregationType.T | undefined,
): string {
  const sourceSql = quoteSqlIdentifier(column.baseColumn.name);
  switch (aggregation) {
    case undefined:
    case "none":
    case "group_by":
      return sourceSql;
    case "sum":
    case "avg":
    case "count":
    case "min":
    case "max":
      return `${aggregation}(${sourceSql})`;
  }
}
