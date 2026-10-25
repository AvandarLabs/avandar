import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.ts";
type MakeSqlExpressionKeyFromColumnExpressionOptions = {
  database?: string;
  schema?: string;
  table: string;
  column: string;
  aggregation?: QueryAggregationType.T;
};

/** Encodes an alias-free physical expression without delimiter collisions. */
export function makeSqlExpressionKeyFromColumnExpression(
  options: Readonly<MakeSqlExpressionKeyFromColumnExpressionOptions>,
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
