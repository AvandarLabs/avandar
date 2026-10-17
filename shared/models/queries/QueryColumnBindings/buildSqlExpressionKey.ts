import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.ts";

/** Encodes an alias-free physical expression without delimiter collisions. */
export function buildSqlExpressionKey(
  options: Readonly<{
    database?: string;
    schema?: string;
    table: string;
    column: string;
    aggregation?: QueryAggregationType.T;
  }>,
): string {
  const aggregation =
    options.aggregation === "group_by" || options.aggregation === undefined
      ? "none"
      : options.aggregation;
  return JSON.stringify([
    "sql",
    [options.database ?? null, options.schema ?? null, options.table],
    options.column,
    aggregation,
  ]);
}
