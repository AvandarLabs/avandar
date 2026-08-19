import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";

/** A single lexical token produced by the DuckDB SQL tokenizer. */
export type SqlToken = {
  kind: "identifier" | "other" | "string" | "symbol";
  value: string;
  isQuoted?: boolean;
};

/** A common table expression name and the token range it is visible in. */
export type CteAlias = {
  name: string;
  scopeStart: number;
  scopeEnd: number;
};

/**
 * The relation effects proven for one source position in a statement.
 * `relationTableNames` holds DuckDB table names rather than ids, because a
 * table name is what the tokens carry: a dataset's table name is its bare id,
 * and every other relation kind adds a prefix. The top-level analyzer turns
 * those names into `RelationRef` values. Mutation targets stay dataset ids,
 * because only bare-UUID dataset tables are recognized as targets.
 */
export type SourceAnalysis = {
  relationTableNames: string[];
  unsafeReason?: DuckDbUnsafeSqlReason;
  isMutating: boolean;
  mutatedDatasetIds: string[];
};

/** Token indexes of a statement's mutation targets, and their completeness. */
export type MutationTargetAnalysis = {
  indexes: number[];
  isComplete: boolean;
};

/** A dotted identifier's parts and the index of its final token. */
export type IdentifierParts = { endIndex: number; parts: string[] };

/** Explains why SQL cannot be safely treated as a complete read query. */
export type DuckDbUnsafeSqlReason =
  | "dynamic-query"
  | "invalid-sql"
  | "uninspectable-source";

/**
 * Describes the statically proven relation effects of DuckDB SQL. A `read`
 * names every relation it touches, whatever kind each one is, so a caller can
 * resolve a concept table as readily as a dataset table. The `mutating` and
 * `unsafe` variants stay dataset ids: mutation and the fail-closed paths are
 * dataset-only today, and a concept table read by unanalyzable SQL is not
 * reported as a dataset it is not.
 */
export type DuckDbSqlAnalysis =
  | { kind: "read"; relations: RelationRef.T[] }
  | {
      kind: "mutating";
      readDatasetIds: string[];
      mutatedDatasetIds: string[];
    }
  | {
      kind: "unsafe";
      reason: DuckDbUnsafeSqlReason;
      datasetIds: string[];
    };

/**
 * Analyzes SQL nested inside a source, such as the string argument to
 * `query(...)`. Source analysis takes this as a parameter so it does not have
 * to import the top-level analyzer that calls it.
 */
export type NestedSqlAnalyzer = (
  options: Readonly<{ sql: string; recursionDepth: number }>,
) => DuckDbSqlAnalysis;
