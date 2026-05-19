/**
 * Best-effort parser from a raw SQL string into a {@link
 * PartialStructuredQuery} that the manual query form can display.
 *
 * This is the unidirectional ingest path for Phase 1 of the SQL ↔ form sync
 * feature: chat-generated or hand-edited SQL is parsed into AST form using
 * `node-sql-parser`, and recognised shapes are mapped onto the manual query
 * model. Anything we cannot represent in the form (window functions, CTEs,
 * UNIONs, subqueries, joins, etc.) is reported through the
 * `unmappedReasons` list so the UI can show an "approximation only" badge.
 */
import { Model } from "@models/Model/Model.ts";
import { uuid } from "$/lib/uuid.ts";
import { Parser } from "node-sql-parser";
import { EMPTY_QUERY_FILTER } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type { DatasetModel } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { QueryAggregationTypeT } from "$/models/queries/QueryAggregationType/QueryAggregationType.types.ts";
import type { QueryColumnId, QueryColumnRead } from "$/models/queries/QueryColumn/QueryColumn.types.ts";
import type {
  QueryFilter,
  QueryFilterCombinator,
  QueryFilterGroup,
  QueryFilterOperator,
  QueryFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type {
  PartialStructuredQuery,
  StructuredQueryId,
} from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

export type SqlMappingResult = {
  /** The best-effort structured query produced from the SQL. */
  query: PartialStructuredQuery;
  /**
   * Whether the manual form represents the SQL faithfully. When `false`,
   * `unmappedReasons` explains what was dropped.
   */
  isFullyMapped: boolean;
  /** Human-readable reasons why the mapping is partial. */
  unmappedReasons: readonly string[];
};

export type SqlMappingInput = {
  /** The SQL string to parse. */
  sql: string;
  /**
   * Datasets in the current workspace that the query may reference. We use
   * these to resolve `FROM <table>` back to a `DatasetModel`. The table name
   * we look for is the dataset's id (matching how `structuredQueryToSQL`
   * emits SQL).
   */
  datasets: ReadonlyArray<{
    dataset: DatasetModel["Read"];
    columns: readonly DatasetColumnRead[];
  }>;
};

type DatasetWithColumns = SqlMappingInput["datasets"][number];

/**
 * Maps the AST's aggregation function name onto our QueryAggregationType.
 */
function _matchAggregation(name: string): QueryAggregationTypeT | undefined {
  const normalized = name.trim().toLowerCase();
  if (normalized === "sum") {
    return "sum";
  }
  if (normalized === "avg" || normalized === "average") {
    return "avg";
  }
  if (normalized === "count") {
    return "count";
  }
  if (normalized === "max") {
    return "max";
  }
  if (normalized === "min") {
    return "min";
  }
  return undefined;
}

function _identifierToString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (
    value !== null &&
    typeof value === "object" &&
    "expr" in (value as Record<string, unknown>)
  ) {
    const inner = (value as { expr: unknown }).expr;
    if (
      inner !== null &&
      typeof inner === "object" &&
      "value" in (inner as Record<string, unknown>)
    ) {
      return String((inner as { value: unknown }).value);
    }
  }
  return undefined;
}

/**
 * Extract a column name from an AST column-ref node.
 */
function _columnRefName(node: unknown): string | undefined {
  if (node === null || typeof node !== "object") {
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  if (obj.type !== "column_ref") {
    return undefined;
  }
  return _identifierToString(obj.column);
}

/**
 * Translate a parser binary operator to a {@link QueryFilterOperator}.
 */
function _toFilterOperator(
  operator: string,
): QueryFilterOperator | undefined {
  const op = operator.toUpperCase();
  if (op === "=") return "=";
  if (op === "!=" || op === "<>") return "!=";
  if (op === ">") return ">";
  if (op === ">=") return ">=";
  if (op === "<") return "<";
  if (op === "<=") return "<=";
  if (op === "LIKE") return "like";
  if (op === "NOT LIKE") return "not_like";
  if (op === "IN") return "in";
  if (op === "NOT IN") return "not_in";
  if (op === "BETWEEN") return "between";
  if (op === "IS") return "is_null";
  return undefined;
}

function _literalValue(
  node: unknown,
): string | number | boolean | null | undefined {
  if (node === null || typeof node !== "object") {
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  const valueType = obj.type;
  if (
    valueType === "single_quote_string" ||
    valueType === "string" ||
    valueType === "double_quote_string" ||
    valueType === "backticks_quote_string" ||
    valueType === "var_string" ||
    valueType === "natural_string" ||
    valueType === "date" ||
    valueType === "datetime" ||
    valueType === "time" ||
    valueType === "timestamp"
  ) {
    return String(obj.value);
  }
  if (valueType === "number" || valueType === "bigint") {
    return Number(obj.value);
  }
  if (valueType === "bool" || valueType === "boolean") {
    return Boolean(obj.value);
  }
  if (valueType === "null") {
    return null;
  }
  return undefined;
}

function _extractValueList(
  node: unknown,
): ReadonlyArray<string | number> | undefined {
  if (node === null || typeof node !== "object") {
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  if (obj.type !== "expr_list") {
    return undefined;
  }
  const items = obj.value;
  if (!Array.isArray(items)) {
    return undefined;
  }
  const out: Array<string | number> = [];
  for (const item of items) {
    const lit = _literalValue(item);
    if (lit === undefined || lit === null || typeof lit === "boolean") {
      return undefined;
    }
    out.push(lit);
  }
  return out;
}

function _parseWhereNode(
  node: unknown,
  unmappedReasons: string[],
): QueryFilter | undefined {
  if (node === null || typeof node !== "object") {
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  if (obj.type !== "binary_expr") {
    unmappedReasons.push(
      `WHERE clause contains a "${String(obj.type)}" node that the form does not support.`,
    );
    return undefined;
  }

  const operator = String(obj.operator ?? "").toUpperCase();
  if (operator === "AND" || operator === "OR") {
    const left = _parseWhereNode(obj.left, unmappedReasons);
    const right = _parseWhereNode(obj.right, unmappedReasons);
    const rules: QueryFilter[] = [];
    if (left) {
      if (left.type === "group" && left.combinator === operator) {
        left.rules.forEach((r) => {
          rules.push(r);
        });
      } else {
        rules.push(left);
      }
    }
    if (right) {
      if (right.type === "group" && right.combinator === operator) {
        right.rules.forEach((r) => {
          rules.push(r);
        });
      } else {
        rules.push(right);
      }
    }
    if (rules.length === 0) {
      return undefined;
    }
    const group: QueryFilterGroup = {
      type: "group",
      combinator: operator as QueryFilterCombinator,
      rules,
    };
    return group;
  }

  // Leaf comparison
  const columnName = _columnRefName(obj.left);
  if (!columnName) {
    unmappedReasons.push(
      "WHERE clause uses an expression on the left-hand side that is not a column reference.",
    );
    return undefined;
  }

  // IS NULL / IS NOT NULL
  if (operator === "IS" || operator === "IS NOT") {
    const rightAsBool = (obj.right as { type?: string } | null)?.type;
    if (rightAsBool === "null") {
      const rule: QueryFilterRule = {
        type: "rule",
        columnName,
        operator: operator === "IS" ? "is_null" : "is_not_null",
        value: null,
      };
      return rule;
    }
    unmappedReasons.push(
      `WHERE clause uses "${operator}" with a non-null right-hand side; only IS NULL / IS NOT NULL are mapped.`,
    );
    return undefined;
  }

  if (operator === "BETWEEN") {
    const valueList = _extractValueList(obj.right);
    if (!valueList || valueList.length !== 2) {
      unmappedReasons.push(
        `WHERE clause uses BETWEEN on "${columnName}" with a value that the form cannot represent.`,
      );
      return undefined;
    }
    const rule: QueryFilterRule = {
      type: "rule",
      columnName,
      operator: "between",
      value: valueList,
    };
    return rule;
  }

  if (operator === "IN" || operator === "NOT IN") {
    const valueList = _extractValueList(obj.right);
    if (!valueList) {
      unmappedReasons.push(
        `WHERE clause uses "${operator}" on "${columnName}" with a non-literal list.`,
      );
      return undefined;
    }
    const rule: QueryFilterRule = {
      type: "rule",
      columnName,
      operator: operator === "IN" ? "in" : "not_in",
      value: valueList,
    };
    return rule;
  }

  const filterOp = _toFilterOperator(operator);
  if (!filterOp) {
    unmappedReasons.push(
      `WHERE clause uses operator "${operator}" which the form does not support.`,
    );
    return undefined;
  }

  const literal = _literalValue(obj.right);
  if (literal === undefined) {
    unmappedReasons.push(
      `WHERE clause compares "${columnName}" against a non-literal expression.`,
    );
    return undefined;
  }

  const rule: QueryFilterRule = {
    type: "rule",
    columnName,
    operator: filterOp,
    value: literal,
  };
  return rule;
}

/**
 * Make the empty result for the case where we could not produce anything
 * useful from the SQL.
 */
function _makeUnmappedResult(reasons: readonly string[]): SqlMappingResult {
  const query: PartialStructuredQuery = Model.make("StructuredQuery", {
    id: uuid<StructuredQueryId>(),
    version: 1,
    dataSource: undefined,
    queryColumns: [],
    orderByColumn: undefined,
    orderByDirection: undefined,
    aggregations: {},
    filters: EMPTY_QUERY_FILTER,
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
 * Resolve the FROM clause to a known dataset. We currently support only a
 * single base table reference: joins, subqueries, dual, and CTEs are flagged
 * as unmapped.
 */
function _resolveDataset(
  fromList: unknown,
  datasets: readonly DatasetWithColumns[],
  unmappedReasons: string[],
): DatasetWithColumns | undefined {
  if (!Array.isArray(fromList) || fromList.length === 0) {
    unmappedReasons.push("Could not determine a base table from FROM clause.");
    return undefined;
  }
  if (fromList.length > 1) {
    unmappedReasons.push(
      "Query references multiple tables (joins). The form supports a single table.",
    );
  }
  const first = fromList[0] as Record<string, unknown>;
  const tableName = first.table;
  if (typeof tableName !== "string") {
    unmappedReasons.push("FROM clause is not a plain table reference.");
    return undefined;
  }
  const match = datasets.find((d) => {
    return (
      d.dataset.id === tableName ||
      d.dataset.name === tableName ||
      d.dataset.name.toLowerCase() === tableName.toLowerCase()
    );
  });
  if (!match) {
    unmappedReasons.push(
      `Could not find a known dataset matching "${tableName}".`,
    );
    return undefined;
  }
  return match;
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
export function sqlToStructuredQuery(
  input: SqlMappingInput,
): SqlMappingResult {
  const unmappedReasons: string[] = [];
  const trimmed = input.sql.trim();
  if (trimmed.length === 0) {
    return _makeUnmappedResult(["SQL is empty."]);
  }

  let parsedAst: unknown;
  try {
    const parser = new Parser();
    parsedAst = parser.astify(trimmed, { database: "postgresql" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return _makeUnmappedResult([
      `Could not parse SQL: ${message}`,
    ]);
  }

  // node-sql-parser returns either a single AST or an array. We only handle
  // a single SELECT.
  if (Array.isArray(parsedAst)) {
    if (parsedAst.length !== 1) {
      unmappedReasons.push(
        "SQL contains multiple statements; the form maps only the first.",
      );
    }
    parsedAst = parsedAst[0];
  }

  const ast = parsedAst as Record<string, unknown> | null;
  if (!ast || ast.type !== "select") {
    return _makeUnmappedResult([
      "The form only supports SELECT queries.",
    ]);
  }

  if (ast.with) {
    unmappedReasons.push("CTEs (WITH clauses) are not supported in the form.");
  }
  if (ast.having) {
    unmappedReasons.push("HAVING clause is not supported in the form.");
  }
  const distinctType =
    ast.distinct &&
    typeof ast.distinct === "object" &&
    "type" in (ast.distinct as Record<string, unknown>) ?
      (ast.distinct as { type: unknown }).type
    : ast.distinct;
  if (distinctType) {
    unmappedReasons.push("DISTINCT is not supported in the form.");
  }
  if (ast._next || ast.set_op) {
    unmappedReasons.push("UNION/INTERSECT/EXCEPT is not supported in the form.");
  }

  // Resolve dataset
  const dataset = _resolveDataset(ast.from, input.datasets, unmappedReasons);
  if (!dataset) {
    return _makeUnmappedResult(unmappedReasons);
  }

  // Walk select columns
  const queryColumns: QueryColumnRead[] = [];
  const aggregations: Record<QueryColumnId, QueryAggregationTypeT> = {};
  const columnsList = ast.columns;
  if (Array.isArray(columnsList)) {
    for (const item of columnsList) {
      const expr = (item as { expr?: unknown }).expr;
      if (!expr || typeof expr !== "object") {
        unmappedReasons.push("Unrecognised SELECT item; skipped.");
        continue;
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
        continue;
      }

      // Plain column reference
      if (exprType === "column_ref") {
        const columnName = _identifierToString(exprObj.column);
        if (!columnName) {
          unmappedReasons.push("Unnamed column expression in SELECT; skipped.");
          continue;
        }
        const matched = _matchColumn(columnName, dataset.columns);
        if (!matched) {
          unmappedReasons.push(
            `SELECT references column "${columnName}" not present in the dataset.`,
          );
          continue;
        }
        queryColumns.push(_makeQueryColumn(matched, undefined));
        continue;
      }

      // Aggregate function: SUM(col), AVG(col), COUNT(col), MAX(col), MIN(col)
      if (exprType === "aggr_func") {
        const funcName = String(exprObj.name ?? "");
        const agg = _matchAggregation(funcName);
        const args = exprObj.args as { expr?: unknown } | undefined;
        const inner = args?.expr;
        const colName = _columnRefName(inner);
        if (!agg) {
          unmappedReasons.push(
            `Unsupported aggregate function "${funcName}" in SELECT; skipped.`,
          );
          continue;
        }
        if (!colName) {
          unmappedReasons.push(
            `Aggregate function "${funcName}" uses a complex argument; skipped.`,
          );
          continue;
        }
        const matched = _matchColumn(colName, dataset.columns);
        if (!matched) {
          unmappedReasons.push(
            `Aggregate references column "${colName}" not present in the dataset.`,
          );
          continue;
        }
        const queryColumn = _makeQueryColumn(matched, agg);
        queryColumns.push(queryColumn);
        aggregations[queryColumn.id] = agg;
        continue;
      }

      unmappedReasons.push(
        `SELECT expression of type "${String(exprType)}" is not supported by the form.`,
      );
    }
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
      const colName = _columnRefName(node);
      if (!colName) {
        unmappedReasons.push("GROUP BY uses a non-column expression.");
        return;
      }
      const match = queryColumns.find((c) => {
        return c.baseColumn.name === colName;
      });
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
      unmappedReasons.push(
        "ORDER BY references multiple columns; the form keeps only the first.",
      );
    }
    const first = orderbyClause[0] as { type?: string; expr?: unknown };
    const colName = _columnRefName(first.expr);
    if (colName) {
      const matchCol = queryColumns.find((c) => {
        return c.baseColumn.name === colName;
      });
      if (matchCol) {
        orderByColumn = matchCol.id;
        const dir = String(first.type ?? "").toLowerCase();
        orderByDirection = dir === "desc" ? "desc" : "asc";
      } else {
        unmappedReasons.push(
          `ORDER BY references column "${colName}" not in the SELECT list.`,
        );
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
      const v = limitValues[0] as { value?: unknown };
      const n = Number(v.value);
      if (!Number.isNaN(n)) {
        limit = n;
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
  let filters: QueryFilterGroup = EMPTY_QUERY_FILTER;
  if (ast.where) {
    const parsed = _parseWhereNode(ast.where, unmappedReasons);
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

  const query: PartialStructuredQuery = Model.make("StructuredQuery", {
    id: uuid<StructuredQueryId>(),
    version: 1,
    dataSource: dataset.dataset,
    queryColumns,
    orderByColumn,
    orderByDirection,
    aggregations,
    filters,
    offset,
    limit,
  } as const);

  return {
    query,
    isFullyMapped: unmappedReasons.length === 0,
    unmappedReasons,
  };
}
