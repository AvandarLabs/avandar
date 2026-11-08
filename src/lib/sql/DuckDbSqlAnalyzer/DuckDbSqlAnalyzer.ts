import { prop, propIsDefined } from "@avandar/utils";
import {
  getDatasetIdsAtIndexes,
  getRelationRefFromTableName,
  mergeUniqueNames,
} from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlIdentifiers";
import { getMutationTargetAnalysis } from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlMutations";
import { getSourceAnalyses } from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlSources";
import {
  hasMutation,
  hasOnlyReadStatements,
  hasUnsupportedStatement,
  isSinglePlainQuery,
} from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlStatements";
import { hasUnsupportedSqlSyntax } from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlSyntax";
import {
  getSqlTokens,
  hasInvalidTokenStructure,
} from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlTokens";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type {
  DuckDbSqlAnalysis,
  SourceAnalysis,
  SqlToken,
} from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.types";

export type {
  DuckDbSqlAnalysis,
  DuckDbUnsafeSqlReason,
} from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.types";

const MAX_NESTED_SQL_DEPTH = 16;

/** Names the relation each table name refers to, dropping unknown names. */
function _getRelations(relationTableNames: readonly string[]): RelationRef.T[] {
  return relationTableNames.flatMap((tableName) => {
    const relation = getRelationRefFromTableName(tableName);
    return relation === undefined ? [] : [relation];
  });
}

/** Narrows relation table names to the ids of the datasets among them. */
function _getDatasetIds(relationTableNames: readonly string[]): string[] {
  return _getRelations(relationTableNames).flatMap((relation) => {
    return relation.kind === "dataset" ? [relation.id] : [];
  });
}

function _getMutationAnalysis(
  options: Readonly<{
    relationTableNames: string[];
    sourceAnalyses: readonly SourceAnalysis[];
    tokens: readonly SqlToken[];
  }>,
): DuckDbSqlAnalysis {
  const { relationTableNames, sourceAnalyses, tokens } = options;
  const targetAnalysis = getMutationTargetAnalysis(tokens);
  const readDatasetIds = _getDatasetIds(relationTableNames);
  if (!targetAnalysis.isComplete) {
    return {
      kind: "unsafe",
      reason: "uninspectable-source",
      datasetIds: readDatasetIds,
    };
  }
  const mutatedDatasetIds = mergeUniqueNames(
    getDatasetIdsAtIndexes({ tokens, indexes: targetAnalysis.indexes }),
    ...sourceAnalyses.map(prop("mutatedDatasetIds")),
  );
  return { kind: "mutating", readDatasetIds, mutatedDatasetIds };
}

/** Builds the analysis of a statement no source marked unsafe or mutating. */
function _getReadAnalysis(
  options: Readonly<{
    tokens: readonly SqlToken[];
    sourceAnalyses: readonly SourceAnalysis[];
    relationTableNames: string[];
  }>,
): DuckDbSqlAnalysis {
  const { relationTableNames, sourceAnalyses, tokens } = options;
  if (!hasOnlyReadStatements(tokens)) {
    return {
      kind: "unsafe",
      reason: "invalid-sql",
      datasetIds: _getDatasetIds(relationTableNames),
    };
  }
  return {
    kind: "read",
    relations: _getRelations(relationTableNames),
    internalTableNames: mergeUniqueNames(
      ...sourceAnalyses.map(prop("internalTableNames")),
    ),
  };
}

function _getDuckDbSqlAnalysisFromSql(
  options: Readonly<{ sql: string; recursionDepth: number }>,
): DuckDbSqlAnalysis {
  const { recursionDepth, sql } = options;
  if (hasUnsupportedSqlSyntax(sql)) {
    return { kind: "unsafe", reason: "unsupported-syntax", datasetIds: [] };
  }
  const tokens = getSqlTokens(sql);
  if (
    recursionDepth > MAX_NESTED_SQL_DEPTH ||
    tokens.length === 0 ||
    hasInvalidTokenStructure(tokens)
  ) {
    return { kind: "unsafe", reason: "invalid-sql", datasetIds: [] };
  }
  if (hasUnsupportedStatement(tokens)) {
    return { kind: "unsafe", reason: "unsupported-syntax", datasetIds: [] };
  }
  const sourceAnalyses = getSourceAnalyses({
    getNestedSqlAnalysis: _getDuckDbSqlAnalysisFromSql,
    recursionDepth,
    tokens,
  });
  const relationTableNames = mergeUniqueNames(
    ...sourceAnalyses.map(prop("relationTableNames")),
  );
  const unsafeReason = sourceAnalyses.find(
    propIsDefined("unsafeReason"),
  )?.unsafeReason;
  if (unsafeReason !== undefined) {
    return {
      kind: "unsafe",
      reason: unsafeReason,
      datasetIds: _getDatasetIds(relationTableNames),
    };
  }
  const isMutating =
    hasMutation(tokens) || sourceAnalyses.some(prop("isMutating"));
  return isMutating
    ? _getMutationAnalysis({ tokens, sourceAnalyses, relationTableNames })
    : _getReadAnalysis({ tokens, sourceAnalyses, relationTableNames });
}

/** Returns the complete static relation effect analysis for DuckDB SQL. */
function _getPublicDuckDbSqlAnalysisFromSql(sql: string): DuckDbSqlAnalysis {
  return _getDuckDbSqlAnalysisFromSql({ sql, recursionDepth: 0 });
}

/** Returns whether SQL is one plain query the tokenizer reads faithfully. */
function _isSinglePlainQuerySql(sql: string): boolean {
  return !hasUnsupportedSqlSyntax(sql) && isSinglePlainQuery(getSqlTokens(sql));
}

/** Returns read relation sources, rejecting incomplete or mutating analysis. */
function _getRelationsFromSqlTableReferences(sql: string): RelationRef.T[] {
  const analysis = _getPublicDuckDbSqlAnalysisFromSql(sql);
  if (analysis.kind === "read") {
    return analysis.relations;
  }
  const reason =
    analysis.kind === "mutating" ? "mutating SQL" : analysis.reason;
  throw new Error(`Cannot safely analyze DuckDB SQL: ${reason}`);
}

/** Returns UUID table sources, rejecting incomplete or mutating analysis. */
function _getDatasetIdsFromSqlTableReferences(sql: string): string[] {
  return _getRelationsFromSqlTableReferences(sql).flatMap((relation) => {
    return relation.kind === "dataset" ? [relation.id] : [];
  });
}

/**
 * The datasets a statement must load before it can run, including the ones a
 * CREATE TABLE AS SELECT (or other mutation) reads.
 *
 * The read-only entry point refuses mutating SQL, which is correct for
 * callers that only authorize SELECTs. Individual generation stages rows
 * with CREATE TABLE AS SELECT from those same datasets, and that statement
 * still has to load them.
 */
function _getReadDatasetIdsFromSql(sql: string): string[] {
  const analysis = _getPublicDuckDbSqlAnalysisFromSql(sql);
  if (analysis.kind === "read") {
    return analysis.relations.flatMap((relation) => {
      return relation.kind === "dataset" ? [relation.id] : [];
    });
  }
  if (analysis.kind === "mutating") {
    return analysis.readDatasetIds;
  }
  throw new Error(`Cannot safely analyze DuckDB SQL: ${analysis.reason}`);
}

/** Performs fail-closed static relation-effect analysis for DuckDB SQL. */
export const DuckDbSqlAnalyzer = {
  /** Returns UUID table sources, rejecting incomplete or mutating analysis. */
  getDatasetIdsFromSqlTableReferences: _getDatasetIdsFromSqlTableReferences,
  /**
   * Returns the datasets a statement reads, including mutating SQL whose
   * SELECT sources are datasets.
   */
  getReadDatasetIdsFromSql: _getReadDatasetIdsFromSql,
  /** Returns the complete static relation effect analysis for DuckDB SQL. */
  getDuckDbSqlAnalysisFromSql: _getPublicDuckDbSqlAnalysisFromSql,
  /**
   * Returns whether the SQL is exactly one `SELECT`, `WITH`, `FROM`, or
   * parenthesized query, written in syntax the analyzer can read.
   */
  isSinglePlainQuery: _isSinglePlainQuerySql,
  /** Returns every relation read, rejecting incomplete or mutating analysis. */
  getRelationsFromSqlTableReferences: _getRelationsFromSqlTableReferences,
};
