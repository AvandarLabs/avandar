import { isDefined } from "@avandar/utils";
import {
  normalizeColumns,
  unionColumnSets,
} from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import { getIdentifierParts } from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlIdentifiers";
import {
  getKeywordIndex,
  getParenthesisDepths,
  getSqlTokens,
  isKeywordToken,
} from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlTokens";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ConceptAttributeColumn } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql";
import type { ConceptRelationPlan } from "@/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types";
import type { SqlToken } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.types";

type ColumnSet = readonly string[] | "all";
type TokenAtIndex = { tokens: readonly SqlToken[]; index: number };
type ColumnSetByDatasetId = Record<string, ColumnSet>;

const SKIP_KEYWORDS = new Set([
  "ALL",
  "AND",
  "AS",
  "ASC",
  "BETWEEN",
  "BY",
  "CASE",
  "CAST",
  "CROSS",
  "DESC",
  "DISTINCT",
  "ELSE",
  "END",
  "EXCEPT",
  "EXISTS",
  "FALSE",
  "FROM",
  "FULL",
  "GROUP",
  "HAVING",
  "ILIKE",
  "IN",
  "INNER",
  "INTERSECT",
  "IS",
  "JOIN",
  "LEFT",
  "LIKE",
  "LIMIT",
  "NATURAL",
  "NOT",
  "NULL",
  "OFFSET",
  "ON",
  "OR",
  "ORDER",
  "OUTER",
  "RIGHT",
  "SELECT",
  "THEN",
  "TRUE",
  "UNION",
  "USING",
  "WHEN",
  "WHERE",
  "WITH",
]);

function _isDatasetColumnAttribute(
  column: ConceptAttributeColumn,
): column is Extract<ConceptAttributeColumn, { kind: "dataset_column" }> {
  return column.kind === "dataset_column";
}

function _getConceptColumnsByDatasetId(
  plans: readonly ConceptRelationPlan[],
): ColumnSetByDatasetId {
  return plans.reduce<ColumnSetByDatasetId>((columnsByDatasetId, plan) => {
    return plan.attributeColumns
      .filter(_isDatasetColumnAttribute)
      .reduce((nextColumnsByDatasetId, column) => {
        const prior = nextColumnsByDatasetId[column.datasetId] ?? [];
        nextColumnsByDatasetId[column.datasetId] = unionColumnSets(prior, [
          column.selectColumnName,
          column.primaryKeyColumnName,
        ]);
        return nextColumnsByDatasetId;
      }, columnsByDatasetId);
  }, {});
}

function _getSqlDatasetIds(rawSql: string): string[] | undefined {
  const analysis = DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(rawSql);
  if (analysis.kind !== "read") {
    return undefined;
  }
  return analysis.relations.flatMap((relation) => {
    return relation.kind === "dataset" ? [relation.id] : [];
  });
}

function _selectListHasStar(tokens: readonly SqlToken[]): boolean {
  const depths = getParenthesisDepths(tokens);
  const selectIndex = getKeywordIndex({
    depth: 0,
    endIndex: tokens.length,
    keyword: "SELECT",
    startIndex: 0,
    tokens,
  });
  const fromIndex = getKeywordIndex({
    depth: 0,
    endIndex: tokens.length,
    keyword: "FROM",
    startIndex: selectIndex ?? 0,
    tokens,
  });
  if (selectIndex === undefined || fromIndex === undefined) {
    return true;
  }
  return tokens.slice(selectIndex, fromIndex).some((token, relativeIndex) => {
    return depths[selectIndex + relativeIndex] === 0 && token.value === "*";
  });
}

/** True when the two tokens ending at `index` spell the `::` cast operator. */
function _isCastOperatorEnd(options: Readonly<TokenAtIndex>): boolean {
  const { tokens, index } = options;
  return tokens[index]?.value === ":" && tokens[index - 1]?.value === ":";
}

/**
 * True when the identifier at `index` names a cast's target type.
 *
 * A type name sits exactly where a column sits: an unquoted identifier that is
 * neither a function call nor an alias. Collecting one asks the projection for
 * a column the Parquet has no chance of holding, and a projection that names a
 * missing column fails the whole query with a binder error rather than merely
 * widening the fetch, so this has to be read rather than guessed at.
 */
function _isCastTypeName(options: Readonly<TokenAtIndex>): boolean {
  const { tokens, index } = options;
  // A multi-word type such as `DOUBLE PRECISION` puts several identifiers
  // after the operator, so the operator sits before the last token that is
  // not a bare identifier. Stopping at a keyword is what keeps the alias in
  // `"cases"::DOUBLE AS total` from reading as another word of the type.
  const operatorEndIndex = tokens.slice(0, index).findLastIndex((token) => {
    return (
      token.kind !== "identifier" ||
      isKeywordToken({ token, keywords: SKIP_KEYWORDS })
    );
  });
  return _isCastOperatorEnd({ tokens, index: operatorEndIndex });
}

/** Names introduced by `AS` in this statement, which no relation carries. */
function _getAliasNames(tokens: readonly SqlToken[]): ReadonlySet<string> {
  return new Set(
    tokens.flatMap((token, index) => {
      return token.kind === "identifier" &&
        isKeywordToken({ token: tokens[index - 1], keywords: "AS" })
        ? [token.value]
        : [];
    }),
  );
}

/** Index of one of the statement's own keywords, ignoring subqueries. */
function _getTopLevelKeywordIndex(
  options: Readonly<{ tokens: readonly SqlToken[]; keyword: string }>,
): number | undefined {
  const { tokens, keyword } = options;
  return getKeywordIndex({
    depth: 0,
    endIndex: tokens.length,
    keyword,
    startIndex: 0,
    tokens,
  });
}

/**
 * The index after which a bare name might resolve to a select-list alias.
 *
 * Before `GROUP BY` there is nowhere an alias is in scope: the select list,
 * `FROM`, `JOIN ... ON` and `WHERE` are all evaluated before the select list
 * is projected, so a name in any of them is a real column even when an alias
 * of the same name exists.
 */
function _getAliasScopeIndex(tokens: readonly SqlToken[]): number | undefined {
  const candidates = [
    _getTopLevelKeywordIndex({ tokens, keyword: "GROUP" }),
    _getTopLevelKeywordIndex({ tokens, keyword: "HAVING" }),
    _getTopLevelKeywordIndex({ tokens, keyword: "ORDER" }),
  ].filter(isDefined);
  return candidates.length === 0 ? undefined : Math.min(...candidates);
}

function _shouldSkipIdentifier(
  tokens: readonly SqlToken[],
  index: number,
): boolean {
  const token = tokens[index];
  if (token?.kind !== "identifier") {
    return true;
  }
  if (isKeywordToken({ token, keywords: SKIP_KEYWORDS })) {
    return true;
  }
  if (tokens[index + 1]?.value === "(") {
    return true;
  }
  if (_isCastTypeName({ tokens, index })) {
    return true;
  }
  return isKeywordToken({ token: tokens[index - 1], keywords: "AS" });
}

function _getColumnRefAtIndex(
  options: Readonly<{
    index: number;
    sqlDatasetIds: readonly string[];
    tokens: readonly SqlToken[];
  }>,
): { columnName: string; datasetId: string; endIndex: number } | undefined {
  const identifier = getIdentifierParts({
    startIndex: options.index,
    tokens: options.tokens,
  });
  if (identifier === undefined) {
    return undefined;
  }
  const columnName = identifier.parts.at(-1);
  if (columnName === undefined) {
    return undefined;
  }
  const tableName =
    identifier.parts.length >= 2 ? identifier.parts[0] : undefined;
  if (tableName !== undefined) {
    return options.sqlDatasetIds.includes(tableName)
      ? { columnName, datasetId: tableName, endIndex: identifier.endIndex }
      : undefined;
  }
  if (
    options.sqlDatasetIds.includes(columnName) ||
    options.sqlDatasetIds.length !== 1
  ) {
    return undefined;
  }
  return {
    columnName,
    datasetId: options.sqlDatasetIds[0]!,
    endIndex: identifier.endIndex,
  };
}

/**
 * The column set an occurrence of an alias name contributes.
 *
 * Three regions, because a name that matches an alias is not always the alias.
 * Before `GROUP BY` no alias is in scope, so the name is a real column and is
 * collected as one: that is what keeps `SUM("cases") AS "cases"` projecting
 * `cases`. From `ORDER BY` on, every dialect resolves the name against the
 * select list, so it is the alias and contributes nothing. Between the two the
 * name could be either, and the token stream cannot say which. Widening costs
 * bytes; picking wrong costs the whole query, so that middle case fails wide.
 */
function _getAliasReferenceColumns(
  options: Readonly<{
    aliasScopeIndex: number | undefined;
    columnName: string;
    index: number;
    orderByIndex: number | undefined;
  }>,
): ColumnSet {
  const { aliasScopeIndex, columnName, index, orderByIndex } = options;
  return orderByIndex !== undefined && index > orderByIndex
    ? []
    : aliasScopeIndex !== undefined && index > aliasScopeIndex
      ? "all"
      : [columnName];
}

function _collectSqlColumns(
  tokens: readonly SqlToken[],
  sqlDatasetIds: readonly string[],
): ColumnSetByDatasetId {
  const aliasNames = _getAliasNames(tokens);
  const aliasScopeIndex = _getAliasScopeIndex(tokens);
  const orderByIndex = _getTopLevelKeywordIndex({ tokens, keyword: "ORDER" });
  return tokens.reduce<ColumnSetByDatasetId>(
    (columnsByDatasetId, _token, index) => {
      if (_shouldSkipIdentifier(tokens, index)) {
        return columnsByDatasetId;
      }
      const columnRef = _getColumnRefAtIndex({
        index,
        sqlDatasetIds,
        tokens,
      });
      if (columnRef === undefined) {
        return columnsByDatasetId;
      }
      const contributed = aliasNames.has(columnRef.columnName)
        ? _getAliasReferenceColumns({
            aliasScopeIndex,
            columnName: columnRef.columnName,
            index,
            orderByIndex,
          })
        : [columnRef.columnName];
      const prior = columnsByDatasetId[columnRef.datasetId] ?? [];
      columnsByDatasetId[columnRef.datasetId] = unionColumnSets(
        prior,
        contributed,
      );
      return columnsByDatasetId;
    },
    {},
  );
}

function _getSqlColumnsByDatasetId(
  rawSql: string,
): ColumnSetByDatasetId | "all" {
  const sqlDatasetIds = _getSqlDatasetIds(rawSql);
  if (sqlDatasetIds === undefined) {
    return "all";
  }
  const tokens = getSqlTokens(rawSql);
  if (_selectListHasStar(tokens)) {
    return Object.fromEntries(
      sqlDatasetIds.map((datasetId) => {
        return [datasetId, "all"];
      }),
    );
  }
  return _collectSqlColumns(tokens, sqlDatasetIds);
}

function _getCombinedColumnSet(
  sqlColumns: ColumnSetByDatasetId | "all",
  conceptColumns: ColumnSetByDatasetId,
  datasetId: Dataset.Id,
): ColumnSet {
  if (sqlColumns === "all") {
    return "all";
  }
  const combined = unionColumnSets(
    sqlColumns[datasetId] ?? [],
    conceptColumns[datasetId] ?? [],
  );
  if (combined === "all" || combined.length > 0) {
    return normalizeColumns(combined);
  }
  return "all";
}

/**
 * The columns each dataset relation must hold for this query.
 *
 * Concept contributors are read from attribute mappings. SQL names are read
 * from an explicit select list. `SELECT *`, unreadable SQL, and a dataset
 * with no attributed names fail wide to `"all"`.
 */
export function getNeededColumnsFromQuery(
  options: Readonly<{
    conceptRelations: readonly ConceptRelationPlan[];
    datasetIds: readonly Dataset.Id[];
    rawSql: string;
  }>,
): ColumnSetByDatasetId {
  const conceptColumns = _getConceptColumnsByDatasetId(
    options.conceptRelations,
  );
  const sqlColumns = _getSqlColumnsByDatasetId(options.rawSql);
  return Object.fromEntries(
    options.datasetIds.map((datasetId) => {
      return [
        datasetId,
        _getCombinedColumnSet(sqlColumns, conceptColumns, datasetId),
      ];
    }),
  );
}
