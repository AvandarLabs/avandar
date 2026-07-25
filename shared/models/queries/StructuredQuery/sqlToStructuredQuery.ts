/**
 * Best-effort parser from a raw SQL string into a {@link
 * PartialStructuredQuery} that the manual query form can display.
 *
 * This is the unidirectional ingest path of the SQL/form sync: chat-generated
 * or hand-edited SQL is parsed into AST form using
 * `node-sql-parser`, and recognised shapes are mapped onto the manual query
 * model. Anything we cannot represent in the form (window functions, CTEs,
 * UNIONs, subqueries, joins, etc.) is reported through the
 * `unmappedReasons` list so the UI can show an "approximation only" badge.
 */
import { Model } from "@models/Model/Model.ts";
import { propEq } from "@utils/objects/hofs/propEq/propEq.ts";
import { uuid } from "$/lib/uuid.ts";
import { EMPTY_QUERY_FILTER } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import { Parser } from "node-sql-parser";
import type { DatasetModel } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { QueryAggregationTypeT } from "$/models/queries/QueryAggregationType/QueryAggregationType.types.ts";
import type {
  QueryColumnId,
  QueryColumnRead,
} from "$/models/queries/QueryColumn/QueryColumn.types.ts";
import type {
  QueryFilter,
  QueryFilterCombinator,
  QueryFilterGroup,
  QueryFilterOperator,
  QueryFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type {
  NestedSubquerySource,
  QueryJoin,
  QueryJoinKind,
  QueryJoinOnEquality,
} from "$/models/queries/StructuredQuery/QueryJoin.types.ts";
import type {
  PartialStructuredQuery,
  StructuredQueryId,
} from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

/** Outcome of parsing a SQL string into a partial structured query. */
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

/** Inputs required to parse a SQL string into a structured query. */
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
 * Lookup from an (upper-cased) parser binary operator to the
 * corresponding {@link QueryFilterOperator}. Operators not present here are
 * unsupported by the form.
 */
const _FILTER_OPERATOR_BY_SQL: Record<string, QueryFilterOperator> = {
  "=": "=",
  "!=": "!=",
  "<>": "!=",
  ">": ">",
  ">=": ">=",
  "<": "<",
  "<=": "<=",
  LIKE: "like",
  "NOT LIKE": "not_like",
  IN: "in",
  "NOT IN": "not_in",
  BETWEEN: "between",
  IS: "is_null",
};

/**
 * Translate a parser binary operator to a {@link QueryFilterOperator}.
 */
function _toFilterOperator(operator: string): QueryFilterOperator | undefined {
  return _FILTER_OPERATOR_BY_SQL[operator.toUpperCase()];
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
  const literals = items.map(_literalValue);
  const hasInvalid = literals.some((lit) => {
    return lit === undefined || lit === null || typeof lit === "boolean";
  });
  if (hasInvalid) {
    return undefined;
  }
  return literals as Array<string | number>;
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

type FromResolution = {
  base?: DatasetWithColumns;
  baseAlias?: string;
  nestedSubquery?: NestedSubquerySource;
  joins: QueryJoin[];
};

/**
 * Resolve a single FROM-list entry to a dataset reference (if we know it),
 * a nested subquery, or `undefined` when we can't classify it.
 */
function _resolveDataset(
  tableName: string,
  datasets: readonly DatasetWithColumns[],
): DatasetWithColumns | undefined {
  return datasets.find((d) => {
    return (
      d.dataset.id === tableName ||
      d.dataset.name === tableName ||
      d.dataset.name.toLowerCase() === tableName.toLowerCase()
    );
  });
}

function _joinKindFromKeyword(keyword: string): QueryJoinKind {
  const lower = keyword.toLowerCase();
  if (lower.includes("left")) {
    return "left";
  }
  if (lower.includes("right")) {
    return "right";
  }
  if (lower.includes("full")) {
    return "full";
  }
  if (lower.includes("cross")) {
    return "cross";
  }
  return "inner";
}

function _parseJoinOn(
  onNode: unknown,
  unmappedReasons: string[],
):
  | { predicates: QueryJoinOnEquality[]; combinator: QueryFilterCombinator }
  | undefined {
  if (onNode === null || typeof onNode !== "object") {
    return undefined;
  }
  const obj = onNode as Record<string, unknown>;
  if (obj.type !== "binary_expr") {
    return undefined;
  }
  const operator = String(obj.operator ?? "").toUpperCase();
  if (operator === "AND" || operator === "OR") {
    const left = _parseJoinOn(obj.left, unmappedReasons);
    const right = _parseJoinOn(obj.right, unmappedReasons);
    if (!left || !right) {
      return undefined;
    }
    return {
      predicates: [...left.predicates, ...right.predicates],
      combinator: operator,
    };
  }
  if (operator !== "=") {
    unmappedReasons.push(
      `JOIN ON clause uses "${operator}": only equality joins are mapped.`,
    );
    return undefined;
  }
  const leftCol = _columnRefName(obj.left);
  const rightCol = _columnRefName(obj.right);
  const leftTable = (obj.left as { table?: string | null } | null)?.table;
  const rightTable = (obj.right as { table?: string | null } | null)?.table;
  if (!leftCol || !rightCol) {
    unmappedReasons.push(
      "JOIN ON clause uses a non-column reference; the form will keep it via raw SQL.",
    );
    return undefined;
  }
  return {
    predicates: [
      {
        type: "equality",
        leftColumn: leftCol,
        rightColumn: rightCol,
        ...(leftTable ? { leftTable } : {}),
        ...(rightTable ? { rightTable } : {}),
      },
    ],
    combinator: "AND",
  };
}

function _stringifyNodeSqlParserSelect(node: unknown): string {
  // We embed the original SQL as-is when available. If not, fall back to
  // node-sql-parser's `sqlify`. This is best-effort; if it fails we return
  // an empty string and the caller surfaces a warning.
  try {
    const parser = new Parser();
    return parser.sqlify(node as Parameters<Parser["sqlify"]>[0]);
  } catch {
    return "";
  }
}

/**
 * Walk the FROM list and produce a FromResolution: pick a base dataset
 * (either a known table or a nested subquery), collect any JOINs, and
 * record unmapped reasons.
 */
function _resolveFrom(
  fromList: unknown,
  datasets: readonly DatasetWithColumns[],
  unmappedReasons: string[],
): FromResolution | undefined {
  if (!Array.isArray(fromList) || fromList.length === 0) {
    unmappedReasons.push("Could not determine a base table from FROM clause.");
    return undefined;
  }

  let base: DatasetWithColumns | undefined;
  let baseAlias: string | undefined;
  let nestedSubquery: NestedSubquerySource | undefined;
  const joins: QueryJoin[] = [];

  fromList.forEach((rawItem, idx) => {
    const item = rawItem as Record<string, unknown>;
    const joinKeyword =
      typeof item.join === "string" && item.join.length > 0 ?
        (item.join as string)
      : undefined;
    const tableName = typeof item.table === "string" ? item.table : undefined;
    const alias = typeof item.as === "string" ? item.as : undefined;
    const subqueryExpr =
      (
        item.expr &&
        typeof item.expr === "object" &&
        "ast" in (item.expr as Record<string, unknown>)
      ) ?
        (item.expr as { ast: unknown }).ast
      : undefined;

    if (idx === 0) {
      // Base table
      if (subqueryExpr) {
        const sql = _stringifyNodeSqlParserSelect(subqueryExpr);
        nestedSubquery = {
          type: "subquery",
          id: uuid(),
          sql,
          alias: alias ?? "subq",
        };
        if (!sql) {
          nestedSubquery.parseFailed = true;
          unmappedReasons.push(
            "Nested subquery in FROM could not be re-serialised; mapping kept as a placeholder.",
          );
        }
      } else if (tableName) {
        base = _resolveDataset(tableName, datasets);
        baseAlias = alias;
        if (!base) {
          unmappedReasons.push(
            `Could not find a known dataset matching "${tableName}".`,
          );
        }
      } else {
        unmappedReasons.push("FROM clause is not a plain table reference.");
      }
      return;
    }

    // Subsequent entries: either a JOIN or a comma-separated cross product
    if (!joinKeyword) {
      unmappedReasons.push(
        "Comma-joined tables are not mapped; treat them as INNER JOIN with ON true.",
      );
      return;
    }

    const onParsed = _parseJoinOn(item.on, unmappedReasons);
    const kind = _joinKindFromKeyword(joinKeyword);
    if (subqueryExpr) {
      const sql = _stringifyNodeSqlParserSelect(subqueryExpr);
      const subAlias = alias ?? `j${idx}`;
      joins.push({
        id: uuid(),
        kind,
        target: {
          type: "subquery",
          subqueryId: sql || `/* unmapped subquery ${idx} */`,
          alias: subAlias,
        },
        on: onParsed ? onParsed.predicates : [],
        combinator: onParsed?.combinator ?? "AND",
      });
      if (!sql) {
        unmappedReasons.push(
          `JOIN subquery at position ${idx} could not be re-serialised.`,
        );
      }
      return;
    }
    if (!tableName) {
      unmappedReasons.push(
        `JOIN entry at position ${idx} is not a plain table reference.`,
      );
      return;
    }
    joins.push({
      id: uuid(),
      kind,
      target: { type: "table", tableName, ...(alias ? { alias } : {}) },
      on: onParsed ? onParsed.predicates : [],
      combinator: onParsed?.combinator ?? "AND",
    });
  });

  if (!base && !nestedSubquery) {
    return undefined;
  }
  return { base, baseAlias, nestedSubquery, joins };
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
    return _makeUnmappedResult([`Could not parse SQL: ${message}`]);
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
    return _makeUnmappedResult(["The form only supports SELECT queries."]);
  }

  if (ast.with) {
    unmappedReasons.push("CTEs (WITH clauses) are not supported in the form.");
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
    unmappedReasons.push("DISTINCT is not supported in the form.");
  }
  if (ast._next || ast.set_op) {
    unmappedReasons.push(
      "UNION/INTERSECT/EXCEPT is not supported in the form.",
    );
  }

  // Resolve FROM clause (base + joins + optional nested subquery)
  const fromResolution = _resolveFrom(
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
        unmappedReasons.push("Unrecognised SELECT item; skipped.");
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
        const columnName = _identifierToString(exprObj.column);
        if (!columnName) {
          unmappedReasons.push("Unnamed column expression in SELECT; skipped.");
          return;
        }
        const matched = _matchColumn(columnName, dataset.columns);
        if (!matched) {
          unmappedReasons.push(
            `SELECT references column "${columnName}" not present in the dataset.`,
          );
          return;
        }
        queryColumns.push(_makeQueryColumn(matched, undefined));
        return;
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
          return;
        }
        if (!colName) {
          unmappedReasons.push(
            `Aggregate function "${funcName}" uses a complex argument; skipped.`,
          );
          return;
        }
        const matched = _matchColumn(colName, dataset.columns);
        if (!matched) {
          unmappedReasons.push(
            `Aggregate references column "${colName}" not present in the dataset.`,
          );
          return;
        }
        const queryColumn = _makeQueryColumn(matched, agg);
        queryColumns.push(queryColumn);
        aggregations[queryColumn.id] = agg;
        return;
      }

      unmappedReasons.push(
        `SELECT expression of type "${String(exprType)}" is not supported by the form.`,
      );
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
      const colName = _columnRefName(node);
      if (!colName) {
        unmappedReasons.push("GROUP BY uses a non-column expression.");
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
      unmappedReasons.push(
        "ORDER BY references multiple columns; the form keeps only the first.",
      );
    }
    const first = orderbyClause[0] as { type?: string; expr?: unknown };
    const colName = _columnRefName(first.expr);
    if (colName) {
      const matchCol = queryColumns.find(propEq("baseColumn.name", colName));
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

  // HAVING → filter group (we re-use the WHERE parser; predicates over
  // aggregate functions get serialised back to the column they aggregate).
  let having: QueryFilterGroup = EMPTY_QUERY_FILTER;
  if (ast.having) {
    const parsedHaving = _parseHavingNode(ast.having, unmappedReasons);
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

/**
 * Parse a HAVING clause AST node into a filter tree. HAVING typically
 * references aggregate functions; we treat the aggregate as the column
 * (e.g. `count(age)` becomes a rule on the column "age" with an explicit
 * `COUNT(...)` prefix preserved in the renderer).
 */
function _parseHavingNode(
  node: unknown,
  unmappedReasons: string[],
): QueryFilter | undefined {
  if (node === null || typeof node !== "object") {
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  if (obj.type !== "binary_expr") {
    unmappedReasons.push(
      `HAVING clause contains a "${String(obj.type)}" node that the form cannot represent.`,
    );
    return undefined;
  }
  const operator = String(obj.operator ?? "").toUpperCase();
  if (operator === "AND" || operator === "OR") {
    const left = _parseHavingNode(obj.left, unmappedReasons);
    const right = _parseHavingNode(obj.right, unmappedReasons);
    const rules: QueryFilter[] = [];
    if (left) {
      rules.push(left);
    }
    if (right) {
      rules.push(right);
    }
    if (rules.length === 0) {
      return undefined;
    }
    return {
      type: "group",
      combinator: operator as QueryFilterCombinator,
      rules,
    };
  }

  // Aggregate function on the left: count(col) > 5
  const left = obj.left as Record<string, unknown> | null;
  let columnName: string | undefined;
  if (left?.type === "aggr_func") {
    const funcName = String(left.name ?? "");
    const args = left.args as { expr?: unknown } | undefined;
    const innerCol = _columnRefName(args?.expr);
    if (innerCol) {
      columnName = `${funcName.toLowerCase()}(${innerCol})`;
    } else {
      unmappedReasons.push(
        `HAVING uses aggregate ${funcName} on a complex argument; mapping kept the predicate as a label.`,
      );
      columnName = funcName.toLowerCase();
    }
  } else if (left?.type === "column_ref") {
    columnName = _columnRefName(left);
  }
  if (!columnName) {
    unmappedReasons.push(
      "HAVING clause uses a left-hand side the form cannot represent.",
    );
    return undefined;
  }

  const filterOp = _toFilterOperator(operator);
  if (!filterOp) {
    unmappedReasons.push(
      `HAVING uses operator "${operator}" which the form does not support.`,
    );
    return undefined;
  }
  const literal = _literalValue(obj.right);
  if (literal === undefined) {
    unmappedReasons.push(
      `HAVING compares "${columnName}" against a non-literal expression.`,
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
