import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.ts";

/**
 * Builds a key for a selected expression (table, column, and aggregation)
 * that ignores aliases and cannot collide across delimiters. Use it wherever
 * projections must be compared by what they select, for example to match a
 * projection read from SQL with one from a structured query.
 */
export function makeSqlExpressionKeyFromColumnExpression(
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
