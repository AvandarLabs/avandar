import { quoteSqlIdentifier } from "@utils/sql/index.ts";
import { match } from "ts-pattern";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.ts";

/**
 * Builds the SQL expression for a query column: its quoted source column name,
 * wrapped in its aggregation function when it has one. Use it wherever SQL
 * must refer to a column the way the SELECT list does, for example in a
 * HAVING filter on an aggregated column.
 */
export function makeSqlExpressionFromQueryColumn({
  column,
  aggregation,
}: Readonly<{
  column: Readonly<QueryColumn.T>;
  aggregation: QueryAggregationType.T | undefined;
}>): string {
  const sourceSql = quoteSqlIdentifier(QueryColumn.getSourceColumnName(column));
  return match(aggregation)
    .with(undefined, "none", "group_by", () => {
      return sourceSql;
    })
    .with("sum", "avg", "count", "min", "max", (operation) => {
      return `${operation}(${sourceSql})`;
    })
    .exhaustive();
}
