import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import {
  getTableNameFromRowNumberedViewName,
  isStagingIndividualsTableName,
} from "@/clients/DuckDbClient/duckDbSqlText";
import {
  getCopyDirectionKeywordIndexes,
  getCopyRelationSourceIndexes,
} from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlCopyStatements";
import {
  getCteAliases,
  isSuppressedCteAlias,
} from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlCteScopes";
import {
  getDatasetIdFromRelationAtIndex,
  getDatasetIdFromTableName,
  getIdentifierParts,
  isRelationTableName,
} from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlIdentifiers";
import { getDmlUsingKeywordIndexes } from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlMutations";
import {
  getClosingParenthesisIndex,
  getParenthesisDepths,
  isKeywordToken,
} from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlTokens";
import type {
  CteAlias,
  DuckDbSqlAnalysis,
  DuckDbUnsafeSqlReason,
  IdentifierParts,
  NestedSqlAnalyzer,
  SourceAnalysis,
  SqlToken,
} from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.types";

type TableFunctionOptions = {
  functionNameIndex: number;
  getNestedSqlAnalysis: NestedSqlAnalyzer;
  recursionDepth: number;
  tokens: readonly SqlToken[];
};

type IdentifierSourceOptions = {
  aliases: readonly CteAlias[];
  getNestedSqlAnalysis: NestedSqlAnalyzer;
  identifier: IdentifierParts;
  recursionDepth: number;
  sourceIndex: number;
  tokens: readonly SqlToken[];
};

type SourceOptions = {
  aliases: readonly CteAlias[];
  getNestedSqlAnalysis: NestedSqlAnalyzer;
  recursionDepth: number;
  sourceIndex: number;
  tokens: readonly SqlToken[];
};

const INSPECTABLE_TABLE_FUNCTIONS = new Set([
  "generate_series",
  "range",
  "unnest",
  "json_each",
]);
/**
 * Words that, right before `TABLE`, make it part of a statement's own syntax
 * (`CREATE TABLE`, `DROP TABLE`) rather than the start of a `TABLE name` query.
 */
const TABLE_DECLARATION_KEYWORDS = new Set([
  "ALTER",
  "CREATE",
  "DROP",
  "FOREIGN",
  "GLOBAL",
  "LOCAL",
  "LOCK",
  "ON",
  "REPLACE",
  "RETURNS",
  "TEMP",
  "TEMPORARY",
  "TRUNCATE",
  "UNLOGGED",
  "VIRTUAL",
]);
/**
 * Words that can come right before a query that starts with `SHOW`: the end of
 * the previous statement, an opening parenthesis, or `AS` and `EXPLAIN`.
 */
const QUERY_START_KEYWORDS = new Set(["AS", "ANALYZE", "EXPLAIN"]);
const INSPECTABLE_INTERNAL_TABLES = new Set(["reject_errors", "reject_scans"]);
/**
 * Scalar functions whose SQL-standard syntax puts a `FROM` between their
 * arguments, as in `EXTRACT(year FROM "date")`. That `FROM` is followed by an
 * expression, never a relation.
 */
const FROM_ARGUMENT_FUNCTIONS = new Set([
  "EXTRACT",
  "OVERLAY",
  "SUBSTRING",
  "TRIM",
]);

/**
 * Indexes of `FROM` tokens that separate the arguments of a scalar function
 * such as `EXTRACT`, rather than introducing a relation.
 *
 * Only a `FROM` directly inside that function's parentheses counts. A subquery
 * nested in its arguments keeps its own `FROM`, so the relations it reads are
 * still analyzed.
 */
function _getFunctionArgumentFromIndexes(
  tokens: readonly SqlToken[],
): Set<number> {
  const openingIndexes: number[] = [];
  const fromIndexes = new Set<number>();
  tokens.forEach((token, index) => {
    if (token.value === "(") {
      openingIndexes.push(index);
    } else if (token.value === ")") {
      openingIndexes.pop();
    } else if (isKeywordToken({ token, keywords: "FROM" })) {
      const openingIndex = openingIndexes.at(-1);
      const functionToken =
        openingIndex === undefined ? undefined : tokens[openingIndex - 1];
      if (
        isKeywordToken({
          token: functionToken,
          keywords: FROM_ARGUMENT_FUNCTIONS,
        })
      ) {
        fromIndexes.add(index);
      }
    }
  });
  return fromIndexes;
}

/**
 * Builds a read-only source analysis over the given relation table names and,
 * optionally, the internal tables it reads.
 */
function _readSourceAnalysis(
  relationTableNames: readonly string[],
  internalTableNames: readonly string[] = [],
): SourceAnalysis {
  return {
    relationTableNames: [...relationTableNames],
    internalTableNames: [...internalTableNames],
    isMutating: false,
    mutatedDatasetIds: [],
  };
}

/** Builds a source analysis that fails closed with the given reason. */
function _unsafeSourceAnalysis(
  unsafeReason: DuckDbUnsafeSqlReason,
): SourceAnalysis {
  return {
    relationTableNames: [],
    internalTableNames: [],
    unsafeReason,
    isMutating: false,
    mutatedDatasetIds: [],
  };
}

function _getSourceAnalysisFromDuckDbSqlAnalysis(
  analysis: Readonly<DuckDbSqlAnalysis>,
): SourceAnalysis {
  if (analysis.kind === "read") {
    return _readSourceAnalysis(
      analysis.relations.map((relation) => {
        return RelationRef.toTableName(relation);
      }),
      analysis.internalTableNames,
    );
  }
  if (analysis.kind === "mutating") {
    // A dataset's table name is its bare id, so the read ids of a nested
    // mutating statement are already table names.
    return {
      relationTableNames: analysis.readDatasetIds,
      internalTableNames: [],
      isMutating: true,
      mutatedDatasetIds: analysis.mutatedDatasetIds,
    };
  }
  return {
    relationTableNames: analysis.datasetIds,
    internalTableNames: [],
    unsafeReason: analysis.reason,
    isMutating: false,
    mutatedDatasetIds: [],
  };
}

function _getFunctionArgumentTokens(
  options: Readonly<{
    tokens: readonly SqlToken[];
    functionNameIndex: number;
  }>,
): SqlToken[] | undefined {
  const { functionNameIndex, tokens } = options;
  const openingIndex = functionNameIndex + 1;
  if (tokens[openingIndex]?.value !== "(") {
    return undefined;
  }
  const closingIndex = getClosingParenthesisIndex({ tokens, openingIndex });
  return closingIndex === undefined
    ? undefined
    : tokens.slice(openingIndex + 1, closingIndex);
}

function _getAnalysisFromQueryFunction(
  options: Readonly<TableFunctionOptions>,
): SourceAnalysis {
  const { functionNameIndex, recursionDepth, tokens } = options;
  const argumentTokens = _getFunctionArgumentTokens({
    tokens,
    functionNameIndex,
  });
  if (argumentTokens?.length !== 1 || argumentTokens[0]?.kind !== "string") {
    return _unsafeSourceAnalysis("dynamic-query");
  }
  const nestedAnalysis = options.getNestedSqlAnalysis({
    sql: argumentTokens[0].value,
    recursionDepth: recursionDepth + 1,
  });
  return _getSourceAnalysisFromDuckDbSqlAnalysis(nestedAnalysis);
}

function _getAnalysisFromTableFunction(
  options: Readonly<TableFunctionOptions>,
): SourceAnalysis {
  const { functionNameIndex, tokens } = options;
  const functionName = tokens[functionNameIndex]?.value.toLowerCase() ?? "";
  const argumentTokens = _getFunctionArgumentTokens({
    tokens,
    functionNameIndex,
  });
  if (argumentTokens === undefined) {
    return _unsafeSourceAnalysis("invalid-sql");
  }
  if (functionName === "query") {
    return _getAnalysisFromQueryFunction(options);
  }
  if (functionName === "query_table") {
    if (argumentTokens.length !== 1 || argumentTokens[0]?.kind !== "string") {
      return _unsafeSourceAnalysis("dynamic-query");
    }
    const datasetId = getDatasetIdFromTableName(argumentTokens[0].value);
    return datasetId === undefined
      ? _unsafeSourceAnalysis("uninspectable-source")
      : _readSourceAnalysis([datasetId]);
  }
  return INSPECTABLE_TABLE_FUNCTIONS.has(functionName)
    ? _readSourceAnalysis([])
    : _unsafeSourceAnalysis("uninspectable-source");
}

function _getAnalysisFromIdentifierSource(
  options: Readonly<IdentifierSourceOptions>,
): SourceAnalysis {
  const { aliases, identifier, sourceIndex, tokens } = options;
  if (tokens[identifier.endIndex + 1]?.value === "(") {
    return _getAnalysisFromTableFunction({
      functionNameIndex: identifier.endIndex,
      getNestedSqlAnalysis: options.getNestedSqlAnalysis,
      recursionDepth: options.recursionDepth,
      tokens,
    });
  }
  const tableName = identifier.parts.at(-1)?.toLowerCase();
  if (
    isSuppressedCteAlias({
      aliases,
      index: sourceIndex,
      parts: identifier.parts,
    })
  ) {
    return _readSourceAnalysis([]);
  }
  if (tableName !== undefined && isRelationTableName(tableName)) {
    return _readSourceAnalysis([tableName]);
  }
  // An `ava_rows_<datasetId>` view reads the dataset's own registered parquet
  // file, so it is a read of that dataset: it is reported as that dataset
  // rather than as an opaque internal table, which is what makes it inherit the
  // dataset's lease and the workspace allowlist that gates it. Treating it as
  // contributing nothing would let raw SQL read a dataset the caller was never
  // authorized for.
  const rowNumberedTableName =
    tableName === undefined
      ? undefined
      : getTableNameFromRowNumberedViewName(tableName);
  if (
    identifier.parts.length === 1 &&
    rowNumberedTableName !== undefined &&
    isRelationTableName(rowNumberedTableName)
  ) {
    return _readSourceAnalysis([rowNumberedTableName]);
  }
  if (
    identifier.parts.length === 1 &&
    tableName !== undefined &&
    INSPECTABLE_INTERNAL_TABLES.has(tableName)
  ) {
    return _readSourceAnalysis([], [tableName]);
  }
  // An `ava_staging_individuals_<conceptId>` table holds rows the caller just
  // materialized from relations it was already authorized for, so reading it
  // back names no relation and needs no lease. Individual generation reads its
  // own staging table through `runRawQuery`, which fails closed on any source
  // it cannot account for, so without this the upsert stage of every sync
  // throws `uninspectable-source`.
  if (
    identifier.parts.length === 1 &&
    tableName !== undefined &&
    isStagingIndividualsTableName(tableName)
  ) {
    return _readSourceAnalysis([], [tableName]);
  }
  return _unsafeSourceAnalysis("uninspectable-source");
}

function _getAnalysisFromSource(
  options: Readonly<SourceOptions>,
): SourceAnalysis {
  const { sourceIndex, tokens } = options;
  const sourceToken = tokens[sourceIndex];
  if (
    sourceToken?.value === "(" ||
    isKeywordToken({ token: sourceToken, keywords: "VALUES" })
  ) {
    return _readSourceAnalysis([]);
  }
  const identifier = getIdentifierParts({ tokens, startIndex: sourceIndex });
  if (identifier === undefined) {
    return _unsafeSourceAnalysis("uninspectable-source");
  }
  return _getAnalysisFromIdentifierSource({ ...options, identifier });
}

function _getAnalysisFromCopyRelation(
  options: Readonly<{ tokens: readonly SqlToken[]; relationIndex: number }>,
): SourceAnalysis {
  const datasetId = getDatasetIdFromRelationAtIndex(options);
  return datasetId === undefined
    ? _unsafeSourceAnalysis("uninspectable-source")
    : _readSourceAnalysis([datasetId]);
}

/**
 * Returns whether the token at `index` introduces a relation.
 *
 * `TABLE` and `SHOW` are also ordinary words, so they count only where a query
 * can start. `TABLE` is a source unless a declaration such as `CREATE` owns it,
 * which fails closed: an unknown word before it leaves it a source. `SHOW` is
 * a source only where DuckDB takes it as a query, so a column named `show` is
 * not.
 */
function _isSourceKeywordIndex(
  options: Readonly<{
    tokens: readonly SqlToken[];
    index: number;
    sourceKeywords: ReadonlySet<string>;
  }>,
): boolean {
  const { index, sourceKeywords, tokens } = options;
  const token = tokens[index];
  const previousToken = tokens[index - 1];
  if (isKeywordToken({ token, keywords: "TABLE" })) {
    return !isKeywordToken({
      token: previousToken,
      keywords: TABLE_DECLARATION_KEYWORDS,
    });
  }
  if (isKeywordToken({ token, keywords: "SHOW" })) {
    return (
      previousToken === undefined ||
      previousToken.value === ";" ||
      previousToken.value === "(" ||
      isKeywordToken({ token: previousToken, keywords: QUERY_START_KEYWORDS })
    );
  }
  return isKeywordToken({ token, keywords: sourceKeywords });
}

function _getDirectSourceIndexes(tokens: readonly SqlToken[]): number[] {
  const sourceKeywords = new Set([
    "DESCRIBE",
    "FROM",
    "JOIN",
    "PIVOT",
    "PIVOT_LONGER",
    "PIVOT_WIDER",
    "SUMMARIZE",
    "UNPIVOT",
  ]);
  const copyDirectionKeywordIndexes = getCopyDirectionKeywordIndexes(tokens);
  const functionArgumentFromIndexes = _getFunctionArgumentFromIndexes(tokens);
  const directIndexes = tokens.flatMap((_token, index) => {
    if (
      !_isSourceKeywordIndex({ tokens, index, sourceKeywords }) ||
      copyDirectionKeywordIndexes.has(index) ||
      functionArgumentFromIndexes.has(index)
    ) {
      return [];
    }
    const sourceIndex = index + 1;
    if (
      isKeywordToken({
        token: tokens[sourceIndex],
        keywords: new Set(["SELECT", "FROM"]),
      })
    ) {
      return [];
    }
    return [sourceIndex];
  });
  return [
    ...directIndexes,
    ...getDmlUsingKeywordIndexes(tokens).map((index) => {
      return index + 1;
    }),
    ...getCopyRelationSourceIndexes(tokens),
  ];
}

function _getCommaSourceIndexes(tokens: readonly SqlToken[]): number[] {
  const clauseEndKeywords = new Set([
    "GROUP",
    "HAVING",
    "LIMIT",
    "ON",
    "ORDER",
    "QUALIFY",
    "UNION",
    "WHEN",
    "WHERE",
    "WINDOW",
  ]);
  const activeFromDepths = new Set<number>();
  const depths = getParenthesisDepths(tokens);
  const functionArgumentFromIndexes = _getFunctionArgumentFromIndexes(tokens);
  const sourceClauseIndexes = new Set([
    ...tokens.flatMap((token, index) => {
      return isKeywordToken({ token, keywords: "FROM" }) &&
        !functionArgumentFromIndexes.has(index)
        ? [index]
        : [];
    }),
    ...getDmlUsingKeywordIndexes(tokens),
  ]);
  return tokens.flatMap((token, index) => {
    const depth = depths[index] ?? 0;
    if (sourceClauseIndexes.has(index)) {
      activeFromDepths.add(depth);
      return [];
    }
    if (isKeywordToken({ token, keywords: clauseEndKeywords })) {
      activeFromDepths.delete(depth);
      return [];
    }
    if (token.value === ")") {
      activeFromDepths.delete(depth + 1);
      return [];
    }
    return token.value === "," && activeFromDepths.has(depth)
      ? [index + 1]
      : [];
  });
}

/** Analyzes every relation the SQL reads from, in token order. */
export function getSourceAnalyses(
  options: Readonly<{
    getNestedSqlAnalysis: NestedSqlAnalyzer;
    recursionDepth: number;
    tokens: readonly SqlToken[];
  }>,
): SourceAnalysis[] {
  const { recursionDepth, tokens } = options;
  const aliases = getCteAliases(tokens);
  const copyRelationSourceIndexes = new Set(
    getCopyRelationSourceIndexes(tokens),
  );
  const sourceIndexes = Array.from(
    new Set([
      ..._getDirectSourceIndexes(tokens),
      ..._getCommaSourceIndexes(tokens),
    ]),
  ).sort((leftIndex, rightIndex) => {
    return leftIndex - rightIndex;
  });
  return sourceIndexes.map((sourceIndex) => {
    if (copyRelationSourceIndexes.has(sourceIndex)) {
      return _getAnalysisFromCopyRelation({
        tokens,
        relationIndex: sourceIndex,
      });
    }
    return _getAnalysisFromSource({
      aliases,
      getNestedSqlAnalysis: options.getNestedSqlAnalysis,
      recursionDepth,
      sourceIndex,
      tokens,
    });
  });
}
