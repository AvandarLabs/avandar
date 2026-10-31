import { Model } from "@avandar/models";
import { makeObject } from "@avandar/utils";
import { Parser } from "node-sql-parser";
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
 * `sqlAstReaders` (low-level AST value readers), `parseFromClause`
 * (FROM/JOIN), and `parseFilterClauses` (WHERE/HAVING), plus a few small
 * private column/result helpers below.
 */
import { uuid } from "$/lib/uuid.ts";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { QueryColumnReconciliation } from "$/models/queries/QueryColumn/QueryColumnReconciliation/QueryColumnReconciliation.ts";
import { normalizeQueryFilters } from "$/models/queries/StructuredQuery/normalizeQueryFilters/normalizeQueryFilters.ts";
import { EMPTY_QUERY_FILTER } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import {
  parseHavingNode,
  parseWhereNode,
} from "$/models/queries/StructuredQuery/sqlToStructuredQuery/parseFilterClauses.ts";
import { parseFromClause } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/parseFromClause.ts";
import { parseSqlProjectionColumns } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/parseSqlProjectionColumns.ts";
import { reconcileParsedColumns } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/reconcileParsedColumns.ts";
import { columnRefName } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlAstReaders.ts";
import type { DatasetModel } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { QueryColumnId } from "$/models/queries/QueryColumn/QueryColumn.types.ts";
import type { ColumnNameQueryFilterGroup as QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
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
    ast.distinct &&
    typeof ast.distinct === "object" &&
    "type" in (ast.distinct as Record<string, unknown>)
      ? (ast.distinct as { type: unknown }).type
      : ast.distinct;
  if (distinctType) {
    unmappedReasons.push({ code: "distinctUnsupported" });
  }
  if (ast._next || ast.set_op) {
    unmappedReasons.push({ code: "setOperationUnsupported" });
  }

  // Resolve FROM clause (base + joins + optional nested subquery)
  const fromResolution = parseFromClause(
    ast.from,
    input.datasets,
    unmappedReasons,
  );
  if (!fromResolution) {
    return _makeUnmappedResult(unmappedReasons);
  }
  const dataset = fromResolution.base;
  const nestedSubquery = fromResolution.nestedSubquery;
  const joins = fromResolution.joins;

  const projection = parseSqlProjectionColumns({
    columnsList: ast.columns,
    groupBy: ast.groupby,
    dataset,
    skipColumnHydration: !dataset || joins.length > 0 || !!nestedSubquery,
  });
  let { queryColumns, aggregations } = projection;
  unmappedReasons.push(...projection.unmappedReasons);

  queryColumns = reconcileParsedColumns({
    columns: queryColumns.map((column) => {
      return {
        ...column,
        aggregation: aggregations[column.id],
      };
    }),
    previousQuery: input.previousQuery,
    dataSource: dataset?.dataset,
  });
  aggregations = makeObject(queryColumns, {
    key: "id",
    valueFn: (column) => {
      return column.aggregation ?? "none";
    },
  });
  const sourceColumns = dataset
    ? QueryColumnReconciliation.reconcileSourceColumns({
        sourceKey: Model.getTypedId(dataset.dataset),
        previousSourceKey: input.previousQuery?.dataSource
          ? Model.getTypedId(input.previousQuery.dataSource)
          : input.sourceColumns
            ? Model.getTypedId(dataset.dataset)
            : undefined,
        previous:
          input.sourceColumns ?? input.previousQuery?.sourceColumns ?? [],
        incoming: dataset.columns.map(QueryColumn.makeFromDatasetColumn),
      })
    : [];

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
      const outputMatches = queryColumns.filter((column) => {
        return QueryColumn.getDerivedColumnName(column) === colName;
      });
      const candidates =
        outputMatches.length > 0
          ? outputMatches
          : queryColumns.filter((column) => {
              return (
                column.baseColumn.name === colName &&
                (column.aggregation === undefined ||
                  column.aggregation === "none" ||
                  column.aggregation === "group_by")
              );
            });
      const matchCol = candidates.length === 1 ? candidates[0] : undefined;
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

  // WHERE → filters
  let filters: QueryFilterGroup = {
    type: "group",
    combinator: "AND",
    rules: [],
  };
  if (ast.where) {
    const parsed = parseWhereNode(ast.where, unmappedReasons);
    if (parsed) {
      filters =
        parsed.type === "group"
          ? parsed
          : ({
              type: "group",
              combinator: "AND",
              rules: [parsed],
            } as QueryFilterGroup);
    }
  }

  // HAVING → filter group (we re-use the WHERE parser; predicates over
  // aggregate functions get serialised back to the column they aggregate).
  let having: QueryFilterGroup = {
    type: "group",
    combinator: "AND",
    rules: [],
  };
  if (ast.having) {
    const parsedHaving = parseHavingNode(ast.having, unmappedReasons);
    if (parsedHaving) {
      having =
        parsedHaving.type === "group"
          ? parsedHaving
          : ({
              type: "group",
              combinator: "AND",
              rules: [parsedHaving],
            } as QueryFilterGroup);
    }
  }

  const columnIdFilters = normalizeQueryFilters({
    filter: filters,
    columns: sourceColumns,
    clause: "where",
  });
  const columnIdHaving = normalizeQueryFilters({
    filter: having,
    columns: queryColumns.filter((column) => {
      return column.aggregation !== "none" && column.aggregation !== undefined;
    }),
    clause: "having",
  });
  columnIdFilters.issues.forEach(() => {
    return unmappedReasons.push({
      code: "whereUnsupportedNode",
      nodeType: "unresolved column",
    });
  });
  columnIdHaving.issues.forEach(() => {
    return unmappedReasons.push({
      code: "havingUnsupportedNode",
      nodeType: "unresolved projection",
    });
  });

  const query: PartialStructuredQuery = Model.make("StructuredQuery", {
    id: uuid<StructuredQueryId>(),
    version: 1,
    dataSource: dataset?.dataset as DatasetModel["Read"],
    ...(nestedSubquery ? { nestedSubquery } : {}),
    queryColumns,
    sourceColumns,
    orderByColumn,
    orderByDirection,
    aggregations,
    filters: columnIdFilters.filter,
    having: columnIdHaving.filter,
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
