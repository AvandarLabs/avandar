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
import type { ConceptAttributeColumn } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql";
import type { ConceptRelationPlan } from "@/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types";
import type { SqlToken } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type ColumnSet = readonly string[] | "all";
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
        return {
          ...nextColumnsByDatasetId,
          [column.datasetId]: unionColumnSets(prior, [
            column.selectColumnName,
            column.primaryKeyColumnName,
          ]),
        };
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
    return options.sqlDatasetIds.includes(tableName) ?
        { columnName, datasetId: tableName, endIndex: identifier.endIndex }
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

function _collectSqlColumns(
  tokens: readonly SqlToken[],
  sqlDatasetIds: readonly string[],
): ColumnSetByDatasetId {
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
      const prior = columnsByDatasetId[columnRef.datasetId] ?? [];
      return {
        ...columnsByDatasetId,
        [columnRef.datasetId]: unionColumnSets(prior, [columnRef.columnName]),
      };
    },
    {},
  );
}

function _getSqlColumnsByDatasetId(rawSql: string): ColumnSetByDatasetId | "all" {
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
