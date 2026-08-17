/**
 * Best-effort parser from a raw SQL string into a {@link
 * PartialStructuredQuery} that the manual query form can display.
 *
 * This is the unidirectional ingest path of the SQL/form sync: chat-generated
 * or hand-edited SQL is parsed into AST form using `node-sql-parser`, and
 * recognised shapes are mapped onto the manual query model. Anything we cannot
 * represent in the form (window functions, CTEs, UNIONs, subqueries, joins,
 * etc.) is reported through the `unmappedReasons` list so the UI can show an
 * "approximation only" badge.
 *
 * This orchestrator wires together the focused helpers in this directory:
 * `sqlAstReaders` (low-level AST value readers), `resolveFromClause`
 * (FROM/JOIN), and `parseFilterClauses` (WHERE/HAVING), plus a few small
 * private column/result helpers below.
 */
import { Model } from "@avandar/models";
import { propEq } from "@avandar/utils";
import { uuid } from "$/lib/uuid.ts";
import { EMPTY_QUERY_FILTER } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import {
  parseHavingNode,
  parseWhereNode,
  stampFilterColumnTypes,
} from "$/models/queries/StructuredQuery/sqlToStructuredQuery/parseFilterClauses.ts";
import { resolveFrom } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/resolveFromClause.ts";
import {
  columnRefName,
  identifierToString,
  matchAggregation,
} from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlAstReaders.ts";
import { Parser } from "node-sql-parser";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { DatasetModel } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { QueryAggregationTypeT } from "$/models/queries/QueryAggregationType/QueryAggregationType.types.ts";
import type {
  QueryColumnId,
  QueryColumnRead,
} from "$/models/queries/QueryColumn/QueryColumn.types.ts";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type { SqlFailedMappingReason } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/SqlFailedMappingReason.types.ts";
import type {
  SqlMappingInput,
  SqlMappingResult,
} from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlToStructuredQuery.types.ts";
import type {
  PartialStructuredQuery,
  StructuredQueryId,
} from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

export type {
  SqlMappingInput,
  SqlMappingResult,
} from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlToStructuredQuery.types.ts";

/**
 * Make the empty result for the case where we could not produce anything
 * useful from the SQL.
 */
function _makeUnmappedResult(
  reasons: readonly SqlFailedMappingReason[],
): SqlMappingResult {
  const query: PartialStructuredQuery = Model.make("StructuredQuery", {
    id: uuid<StructuredQueryId>(),
    version: 1,
    dataSource: undefined,
    queryColumns: [],
    orderByColumn: undefined,
    orderByDirection: undefined,
    aggregations: {},
    filters: EMPTY_QUERY_FILTER,
    having: EMPTY_QUERY_FILTER,
    joins: [],
    offset: undefined,
    limit: undefined,
  } as const);
  return {
    query,
    isFullyMapped: false,
    unmappedReasons: reasons,
  };
}

function _matchColumn(
  columnName: string,
  columns: readonly DatasetColumnRead[],
): DatasetColumnRead | undefined {
  return columns.find((c) => {
    return c.name === columnName || c.originalName === columnName;
  });
}

function _makeQueryColumn(
  baseColumn: DatasetColumnRead,
  aggregation: QueryAggregationTypeT | undefined,
): QueryColumnRead {
  return Model.make("QueryColumn", {
    id: uuid<QueryColumnId>(),
    baseColumn,
    aggregation,
  });
}

/**
 * Attempt to map an SQL string into a structured query for the manual form.
 * Always returns a result; check `isFullyMapped` to know whether anything
 * was dropped.
 */
export function sqlToStructuredQuery(input: SqlMappingInput): SqlMappingResult {
  const unmappedReasons: SqlFailedMappingReason[] = [];
  const trimmed = input.sql.trim();
  if (trimmed.length === 0) {
    return _makeUnmappedResult([{ code: "sqlEmpty" }]);
  }

  let parsedAst: unknown;
  try {
    const parser = new Parser();
    parsedAst = parser.astify(trimmed, { database: "postgresql" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return _makeUnmappedResult([{ code: "sqlUnparseable", message }]);
  }

  // node-sql-parser returns either a single AST or an array. We only handle
  // a single SELECT.
  if (Array.isArray(parsedAst)) {
    if (parsedAst.length !== 1) {
      unmappedReasons.push({ code: "multipleStatements" });
    }
    parsedAst = parsedAst[0];
  }

  const ast = parsedAst as Record<string, unknown> | null;
  if (!ast || ast.type !== "select") {
    return _makeUnmappedResult([{ code: "onlySelectSupported" }]);
  }

  if (ast.with) {
    unmappedReasons.push({ code: "ctesUnsupported" });
  }
  const distinctType =
    (
      ast.distinct &&
      typeof ast.distinct === "object" &&
      "type" in (ast.distinct as Record<string, unknown>)
    ) ?
      (ast.distinct as { type: unknown }).type
    : ast.distinct;
  if (distinctType) {
    unmappedReasons.push({ code: "distinctUnsupported" });
  }
  if (ast._next || ast.set_op) {
    unmappedReasons.push({ code: "setOperationUnsupported" });
  }

  // Resolve FROM clause (base + joins + optional nested subquery)
  const fromResolution = resolveFrom(ast.from, input.datasets, unmappedReasons);
  if (!fromResolution) {
    return _makeUnmappedResult(unmappedReasons);
  }
  const dataset = fromResolution.base;
  const nestedSubquery = fromResolution.nestedSubquery;
  const joins = fromResolution.joins;

  // Walk select columns. When the FROM is a nested subquery or has joins
  // we can't always tie columns back to a known dataset; in those cases we
  // skip column hydration and rely on the raw SQL still being the source
  // of truth.
  const queryColumns: QueryColumnRead[] = [];
  const aggregations: Record<QueryColumnId, QueryAggregationTypeT> = {};
  const columnsList = ast.columns;
  const skipColumnHydration = !dataset || joins.length > 0 || !!nestedSubquery;
  if (Array.isArray(columnsList) && !skipColumnHydration && dataset) {
    columnsList.forEach((item) => {
      const expr = (item as { expr?: unknown }).expr;
      if (!expr || typeof expr !== "object") {
        unmappedReasons.push({ code: "selectItemUnrecognised" });
        return;
      }
      const exprObj = expr as Record<string, unknown>;
      const exprType = exprObj.type;

      // Star "*": expand all columns. node-sql-parser represents `*` as a
      // column_ref whose `column` is the literal string "*", or as a
      // separate `star` node depending on dialect.
      if (
        exprType === "star" ||
        (exprType === "column_ref" && exprObj.column === "*")
      ) {
        dataset.columns.forEach((col) => {
          queryColumns.push(_makeQueryColumn(col, undefined));
        });
        return;
      }

      // Plain column reference
      if (exprType === "column_ref") {
        const columnName = identifierToString(exprObj.column);
        if (!columnName) {
          unmappedReasons.push({ code: "selectUnnamedExpression" });
          return;
        }
        const matched = _matchColumn(columnName, dataset.columns);
        if (!matched) {
          unmappedReasons.push({ code: "selectUnknownColumn", columnName });
          return;
        }
        queryColumns.push(_makeQueryColumn(matched, undefined));
        return;
      }

      // Aggregate function: SUM(col), AVG(col), COUNT(col), MAX(col), MIN(col)
      if (exprType === "aggr_func") {
        const funcName = String(exprObj.name ?? "");
        const agg = matchAggregation(funcName);
        const args = exprObj.args as { expr?: unknown } | undefined;
        const inner = args?.expr;
        const colName = columnRefName(inner);
        if (!agg) {
          unmappedReasons.push({
            code: "selectUnsupportedAggregate",
            funcName,
          });
          return;
        }
        if (!colName) {
          unmappedReasons.push({ code: "aggregateComplexArgument", funcName });
          return;
        }
        const matched = _matchColumn(colName, dataset.columns);
        if (!matched) {
          unmappedReasons.push({
            code: "aggregateUnknownColumn",
            columnName: colName,
          });
          return;
        }
        const queryColumn = _makeQueryColumn(matched, agg);
        queryColumns.push(queryColumn);
        aggregations[queryColumn.id] = agg;
        return;
      }

      unmappedReasons.push({
        code: "selectUnsupportedExpression",
        exprType: String(exprType),
      });
    });
  }

  // Ensure aggregations map covers all columns
  queryColumns.forEach((col) => {
    if (aggregations[col.id] === undefined) {
      aggregations[col.id] = "none";
    }
  });

  // GROUP BY → mark referenced columns as "group_by" if not already aggregated
  const groupby = ast.groupby as { columns?: unknown } | null;
  const groupbyColumns = groupby?.columns;
  if (Array.isArray(groupbyColumns)) {
    groupbyColumns.forEach((node) => {
      const colName = columnRefName(node);
      if (!colName) {
        unmappedReasons.push({ code: "groupByNonColumn" });
        return;
      }
      const match = queryColumns.find(propEq("baseColumn.name", colName));
      if (match) {
        if (aggregations[match.id] === "none") {
          aggregations[match.id] = "group_by";
        }
      }
    });
  }

  // ORDER BY (we only support a single column)
  let orderByColumn: QueryColumnId | undefined;
  let orderByDirection: "asc" | "desc" | undefined;
  const orderbyClause = ast.orderby;
  if (Array.isArray(orderbyClause) && orderbyClause.length > 0) {
    if (orderbyClause.length > 1) {
      unmappedReasons.push({ code: "orderByMultipleColumns" });
    }
    const first = orderbyClause[0] as { type?: string; expr?: unknown };
    const colName = columnRefName(first.expr);
    if (colName) {
      const matchCol = queryColumns.find(propEq("baseColumn.name", colName));
      if (matchCol) {
        orderByColumn = matchCol.id;
        const dir = String(first.type ?? "").toLowerCase();
        orderByDirection = dir === "desc" ? "desc" : "asc";
      } else {
        unmappedReasons.push({
          code: "orderByColumnNotSelected",
          columnName: colName,
        });
      }
    }
  }

  // LIMIT and OFFSET. node-sql-parser orders the values according to the
  // SQL surface form: `LIMIT n OFFSET m` becomes `[n, m]` with seperator
  // = "offset"; MySQL-style `LIMIT m, n` becomes `[m, n]` with seperator
  // = ",".
  let limit: number | undefined;
  let offset: number | undefined;
  const limitClause = ast.limit as {
    value?: unknown[];
    seperator?: string;
  } | null;
  if (limitClause && Array.isArray(limitClause.value)) {
    const limitValues = limitClause.value;
    if (limitValues.length === 1) {
      const limitNode = limitValues[0] as { value?: unknown };
      const limitValue = Number(limitNode.value);
      if (!Number.isNaN(limitValue)) {
        limit = limitValue;
      }
    } else if (limitValues.length === 2) {
      const first = limitValues[0] as { value?: unknown };
      const second = limitValues[1] as { value?: unknown };
      const firstNum = Number(first.value);
      const secondNum = Number(second.value);
      const seperator = limitClause.seperator ?? "";
      if (seperator === ",") {
        // MySQL-style: `LIMIT offset, count`
        if (!Number.isNaN(firstNum)) {
          offset = firstNum;
        }
        if (!Number.isNaN(secondNum)) {
          limit = secondNum;
        }
      } else {
        // Postgres-style: `LIMIT count OFFSET offset`
        if (!Number.isNaN(firstNum)) {
          limit = firstNum;
        }
        if (!Number.isNaN(secondNum)) {
          offset = secondNum;
        }
      }
    }
  }

  /**
   * Column data types keyed by name, so parsed filter rules carry the same
   * `columnDataType` a rule authored in the form would.
   */
  const filterColumnTypes: Record<string, AvaDataType.T> = Object.fromEntries(
    (dataset?.columns ?? []).map((column) => {
      return [column.name, column.dataType];
    }),
  );

  // WHERE → filters
  let filters: QueryFilterGroup = EMPTY_QUERY_FILTER;
  if (ast.where) {
    const parsedRaw = parseWhereNode(ast.where, unmappedReasons);
    const parsed =
      parsedRaw === undefined ?
        undefined
      : stampFilterColumnTypes(parsedRaw, filterColumnTypes);
    if (parsed) {
      filters =
        parsed.type === "group" ?
          parsed
        : ({
            type: "group",
            combinator: "AND",
            rules: [parsed],
          } as QueryFilterGroup);
    }
  }

  // HAVING → filter group (we re-use the WHERE parser; predicates over
  // aggregate functions get serialised back to the column they aggregate).
  let having: QueryFilterGroup = EMPTY_QUERY_FILTER;
  if (ast.having) {
    const parsedHaving = parseHavingNode(ast.having, unmappedReasons);
    if (parsedHaving) {
      having =
        parsedHaving.type === "group" ?
          parsedHaving
        : ({
            type: "group",
            combinator: "AND",
            rules: [parsedHaving],
          } as QueryFilterGroup);
    }
  }

  const query: PartialStructuredQuery = Model.make("StructuredQuery", {
    id: uuid<StructuredQueryId>(),
    version: 1,
    dataSource: dataset?.dataset as DatasetModel["Read"],
    ...(nestedSubquery ? { nestedSubquery } : {}),
    queryColumns,
    orderByColumn,
    orderByDirection,
    aggregations,
    filters,
    having,
    joins,
    offset,
    limit,
  } as const);

  return {
    query,
    isFullyMapped: unmappedReasons.length === 0,
    unmappedReasons,
  };
}
