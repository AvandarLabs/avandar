import { prop, propIsDefined } from "@avandar/utils";
import {
  getDatasetIdsAtIndexes,
  mergeDatasetIds,
} from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlIdentifiers";
import { getMutationTargetAnalysis } from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlMutations";
import { getSourceAnalyses } from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlSources";
import { hasMutation } from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlStatements";
import {
  getSqlTokens,
  hasInvalidTokenStructure,
  isKeywordToken,
} from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlTokens";
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
const READ_STATEMENT_KEYWORDS = new Set([
  "DESCRIBE",
  "EXPLAIN",
  "FROM",
  "PIVOT",
  "SELECT",
  "SHOW",
  "SUMMARIZE",
  "UNPIVOT",
  "VALUES",
  "WITH",
]);

function _hasRecognizedReadStatement(tokens: readonly SqlToken[]): boolean {
  return isKeywordToken({
    token: tokens[0],
    keywords: READ_STATEMENT_KEYWORDS,
  });
}

function _getMutationAnalysis(
  options: Readonly<{
    datasetIds: string[];
    sourceAnalyses: readonly SourceAnalysis[];
    tokens: readonly SqlToken[];
  }>,
): DuckDbSqlAnalysis {
  const { datasetIds, sourceAnalyses, tokens } = options;
  const targetAnalysis = getMutationTargetAnalysis(tokens);
  if (!targetAnalysis.isComplete) {
    return { kind: "unsafe", reason: "uninspectable-source", datasetIds };
  }
  const mutatedDatasetIds = mergeDatasetIds(
    getDatasetIdsAtIndexes({ tokens, indexes: targetAnalysis.indexes }),
    ...sourceAnalyses.map(prop("mutatedDatasetIds")),
  );
  return { kind: "mutating", readDatasetIds: datasetIds, mutatedDatasetIds };
}

function _getDuckDbSqlAnalysisFromSql(
  options: Readonly<{ sql: string; recursionDepth: number }>,
): DuckDbSqlAnalysis {
  const { recursionDepth, sql } = options;
  const tokens = getSqlTokens(sql);
  if (
    recursionDepth > MAX_NESTED_SQL_DEPTH ||
    tokens.length === 0 ||
    hasInvalidTokenStructure(tokens)
  ) {
    return { kind: "unsafe", reason: "invalid-sql", datasetIds: [] };
  }
  const sourceAnalyses = getSourceAnalyses({
    getNestedSqlAnalysis: _getDuckDbSqlAnalysisFromSql,
    recursionDepth,
    tokens,
  });
  const datasetIds = mergeDatasetIds(...sourceAnalyses.map(prop("datasetIds")));
  const unsafeReason = sourceAnalyses.find(
    propIsDefined("unsafeReason"),
  )?.unsafeReason;
  if (unsafeReason !== undefined) {
    return { kind: "unsafe", reason: unsafeReason, datasetIds };
  }
  const isMutating =
    hasMutation(tokens) || sourceAnalyses.some(prop("isMutating"));
  if (isMutating) {
    return _getMutationAnalysis({ tokens, sourceAnalyses, datasetIds });
  }
  if (!_hasRecognizedReadStatement(tokens)) {
    return { kind: "unsafe", reason: "invalid-sql", datasetIds };
  }
  return { kind: "read", datasetIds };
}

/** Returns the complete static dataset effect analysis for DuckDB SQL. */
function _getPublicDuckDbSqlAnalysisFromSql(sql: string): DuckDbSqlAnalysis {
  return _getDuckDbSqlAnalysisFromSql({ sql, recursionDepth: 0 });
}

/** Returns UUID table sources, rejecting incomplete or mutating analysis. */
function _getDatasetIdsFromSqlTableReferences(sql: string): string[] {
  const analysis = _getPublicDuckDbSqlAnalysisFromSql(sql);
  if (analysis.kind === "read") {
    return analysis.datasetIds;
  }
  const reason =
    analysis.kind === "mutating" ? "mutating SQL" : analysis.reason;
  throw new Error(`Cannot safely analyze DuckDB SQL: ${reason}`);
}

/** Performs fail-closed static dataset-effect analysis for DuckDB SQL. */
export const DuckDbSqlAnalyzer = {
  /** Returns UUID table sources, rejecting incomplete or mutating analysis. */
  getDatasetIdsFromSqlTableReferences: _getDatasetIdsFromSqlTableReferences,
  /** Returns the complete static dataset effect analysis for DuckDB SQL. */
  getDuckDbSqlAnalysisFromSql: _getPublicDuckDbSqlAnalysisFromSql,
};
