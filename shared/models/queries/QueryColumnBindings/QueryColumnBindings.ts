import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

/** A supported projection with authoritative or provisional identity. */
export type ProjectionDescriptor = {
  id: QueryColumn.Id;
  identity: "structured" | "sql";
  expressionKey: string;
  sqlExpressionKey: string;
  outputName: string;
};

/** A current output and its recoverable expression lineage. */
export type ResultBinding = QueryResult.Column & {
  id: QueryColumn.Id;
  expressionKey?: string;
  sqlExpressionKey?: string;
};

/** The current resolvable outputs belonging to one query owner. */
export type ResultBindingRegistry = {
  version: 1;
  scopeKey: string;
  sqlKey: string;
  columns: readonly ResultBinding[];
};

/** A result output or projection that cannot safely be addressed. */
export type BindingIssue = {
  target: string;
  reason: "missing" | "ambiguous" | "unsupported";
};

/** Contextual identities alongside unchanged raw output metadata. */
export type BoundResultSchema = {
  registry: ResultBindingRegistry;
  columns: readonly QueryResult.BoundColumn[];
  issues: readonly BindingIssue[];
};
