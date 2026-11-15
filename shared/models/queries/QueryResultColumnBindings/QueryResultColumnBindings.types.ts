import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

/**
 * The query's prediction, made before it runs, of one column its `SELECT`
 * will output.
 *
 * After the query runs, binding matches each descriptor to the real
 * `QueryResult` column with the same `queryResultColumnName`. That match
 * decides which `QueryColumn.Id` the result column receives, so chart
 * settings and filters can keep pointing at the same column across runs.
 *
 * Descriptors only exist for queries over a single table with no joins or
 * subqueries, where each `SELECT` item is a plain column or one aggregate of
 * a plain column. Other queries produce no descriptors.
 */
export type ProjectionDescriptor = {
  /**
   * The column ID to give the matching `QueryResult` column. Whether binding
   * must keep it depends on `identity`.
   */
  id: QueryColumn.Id;

  /**
   * Where `id` came from.
   * - `"structured"`: the query was built in the query builder, so `id` is
   *   the selected `QueryColumn`'s ID and binding always keeps it.
   * - `"sql"`: the query was written as raw SQL, so `id` is a placeholder.
   *   Binding replaces it with the ID of an earlier column that selected the
   *   same expression, when there is exactly one.
   */
  identity: "structured" | "sql";

  /**
   * A string that identifies the selected expression (source column plus
   * aggregation) in the query builder's model. Binding compares it with
   * earlier columns to find the same expression across runs.
   */
  expressionKey: string;

  /**
   * Like `expressionKey`, but derived from the SQL text alone. It is the
   * fallback comparison when one side has no query builder model.
   */
  sqlExpressionKey: string;

  /**
   * The `QueryResult` column name this projection is expected to produce,
   * read from the query before it runs. It is the alias when one is given,
   * otherwise the emitted aggregate name such as `sum(revenue)`, otherwise
   * the source column's name. Binding checks it against the actual result,
   * and a projection whose name no result column has is reported missing.
   */
  queryResultColumnName: string;
};

/**
 * One `QueryResult` column, paired with the column ID that chart settings and
 * filters store, plus the expression keys that prove lineage.
 */
export type QueryResultColumnBinding = QueryResult.Column & {
  id: QueryColumn.Id;
  expressionKey?: string;
  sqlExpressionKey?: string;
};

/**
 * The column bindings of the latest result for one query owner. Passed back
 * as `previous` on the next run so the same columns keep the same IDs, and
 * saved with whatever refers to those IDs, such as a chart on a dashboard.
 */
export type QueryResultColumnBindingRegistry = {
  version: 1;
  scopeKey: string;
  sqlKey: string;
  columns: readonly QueryResultColumnBinding[];
};

/**
 * A `QueryResult` column, projection, or setting that could not be bound to
 * one column ID.
 */
export type QueryResultColumnBindingIssue = {
  target: string;
  reason: "missing" | "ambiguous" | "unsupported";
};

/**
 * The column bindings for one query result: the registry, each `QueryResult`
 * column with its column ID, and the issues for columns that could not be
 * bound.
 */
export type QueryResultColumnBindings = {
  registry: QueryResultColumnBindingRegistry;
  columns: readonly QueryResult.ColumnWithId[];
  issues: readonly QueryResultColumnBindingIssue[];
};
