/**
 * These are the aggregations we allow in Avandar for the Data Explorer app.
 */
export type QueryAggregationTypeT =
  | "sum"
  | "avg"
  | "count"
  | "max"
  | "min"
  | "group_by"
  | "none";

/**
 * Aggregations that map to DuckDB SQL functions (subset of
 * {@link QueryAggregationType}).
 */
export type DuckDBQueryAggregationTypeT =
  | "sum"
  | "avg"
  | "count"
  | "max"
  | "min";
