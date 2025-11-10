/**
 * These are the aggregations we allow in Avandar for the Data Explorer app.
 */
export type QueryAggregationType =
  | "sum"
  | "avg"
  | "count"
  | "max"
  | "min"
  | "group_by"
  | "none";
