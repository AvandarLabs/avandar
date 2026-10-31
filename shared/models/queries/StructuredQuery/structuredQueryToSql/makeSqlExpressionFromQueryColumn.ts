import { quoteSqlIdentifier } from "@utils/sql/index.ts";
import { match } from "ts-pattern";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

/** Builds the typed SQL expression shared by SELECT and HAVING. */
export function makeSqlExpressionFromQueryColumn({
  column,
  aggregation,
}: Readonly<{
  column: Readonly<QueryColumn.T>;
  aggregation: QueryAggregationType.T | undefined;
}>): string {
  const sourceSql = quoteSqlIdentifier(column.baseColumn.name);
  return match(aggregation)
    .with(undefined, "none", "group_by", () => {
      return sourceSql;
    })
    .with("sum", "avg", "count", "min", "max", (operation) => {
      return `${operation}(${sourceSql})`;
    })
    .exhaustive();
}
