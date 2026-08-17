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

/** The dataset effects proven for one source position in a statement. */
export type SourceAnalysis = {
  datasetIds: string[];
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

/** Describes the statically proven dataset effects of DuckDB SQL. */
export type DuckDbSqlAnalysis =
  | { kind: "read"; datasetIds: string[] }
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
