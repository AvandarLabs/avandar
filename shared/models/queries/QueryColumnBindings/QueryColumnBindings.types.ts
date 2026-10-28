import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

/** A supported projection with authoritative or provisional identity. */
export type ProjectionDescriptor = {
  id: QueryColumn.Id;
  identity: "structured" | "sql";
  expressionKey: string;
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
 * One output column of a query result, paired with the column ID that chart
 * settings and filters store, plus the expression keys that prove lineage.
 */
export type ResultColumnBinding = QueryResult.Column & {
  id: QueryColumn.Id;
  expressionKey?: string;
  sqlExpressionKey?: string;
};

/** The column bindings of the latest result for one query owner. */
export type ResultColumnBindingRegistry = {
  version: 1;
  scopeKey: string;
  sqlKey: string;
  columns: readonly ResultColumnBinding[];
};

/** An output column or setting that could not be bound to one column ID. */
export type ColumnBindingIssue = {
  target: string;
  reason: "missing" | "ambiguous" | "unsupported";
};

/**
 * The column bindings for one query result: the registry, each output column
 * with its column ID, and the outputs that could not be bound.
 */
export type ResultColumnBindings = {
  registry: ResultColumnBindingRegistry;
  columns: readonly QueryResult.ColumnWithId[];
  issues: readonly ColumnBindingIssue[];
};
