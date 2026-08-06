/**
 * The aggregations that map to DuckDB SQL functions (subset of
 * {@link QUERY_AGGREGATION_TYPES}).
 */
export const DUCKDB_QUERY_AGGREGATION_TYPES = [
  "sum",
  "avg",
  "count",
  "max",
  "min",
] as const;

/**
 * The aggregations we allow in Avandar for the Data Explorer app. This is the
 * runtime source of truth from which {@link QueryAggregationTypeT} is derived.
 */
export const QUERY_AGGREGATION_TYPES = [
  ...DUCKDB_QUERY_AGGREGATION_TYPES,
  "group_by",
  "none",
] as const;

/**
 * These are the aggregations we allow in Avandar for the Data Explorer app.
 */
export type QueryAggregationTypeT = (typeof QUERY_AGGREGATION_TYPES)[number];

/**
 * Aggregations that map to DuckDB SQL functions (subset of
 * {@link QueryAggregationTypeT}).
 */
export type DuckDbQueryAggregationTypeT =
  (typeof DUCKDB_QUERY_AGGREGATION_TYPES)[number];
