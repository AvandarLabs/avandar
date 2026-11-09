import { PluginError } from "@avandar/plugin-sdk";
import { Parser } from "node-sql-parser";
import type { AST, Select } from "node-sql-parser";

/**
 * Text that could end the expression early or hide what follows it from the
 * parser. Rejected before parsing, even inside a string literal.
 */
const FORBIDDEN_SQL_TOKENS = [";", "--", "/*"] as const;

/**
 * The parser dialects tried in order. `postgresql` reads most DuckDB
 * expressions, and `snowflake` reads the window frames `postgresql` rejects,
 * such as `RANGE BETWEEN INTERVAL 6 DAY PRECEDING`.
 */
const PARSER_DATABASES = ["postgresql", "snowflake"] as const;

/**
 * DuckDB functions a derived column must not call, because they read files,
 * run SQL, reach the network, read settings or the environment, change state,
 * or load extensions. The query engine's analyzer only inspects functions
 * after `FROM` or `JOIN`, so this list and DuckDB's binder are what stop a
 * select-list expression from reading a file. Names are matched in lower
 * case, ignoring any schema prefix.
 */
const DENIED_FUNCTION_NAMES = {
  prefixes: [
    "read_",
    "query",
    "parquet_",
    "iceberg_",
    "delta_",
    "http_",
    "pragma_",
    "duckdb_",
    "sniff_",
  ],
  exact: [
    "glob",
    "current_setting",
    "getenv",
    "nextval",
    "setval",
    "currval",
    "which_secret",
    "load",
    "install",
  ],
} as const;

const FUNCTION_NODE_TYPES = new Set(["function", "aggr_func", "window_func"]);

/**
 * The unqualified name of a parser function node. Aggregate and window nodes
 * carry it as a string. Other function nodes carry `{ name: [...parts] }`
 * with any schema prefix kept separately, so the last part is the name.
 */
function _getFunctionNameOrUndefined(node: object): string | undefined {
  const name: unknown = Reflect.get(node, "name");
  if (typeof name === "string") {
    return name;
  }
  const parts: unknown = _getKeyOrUndefined(name, "name");
  const lastPart: unknown = Array.isArray(parts) ? parts.at(-1) : undefined;
  const value = _getKeyOrUndefined(lastPart, "value");
  return typeof value === "string" ? value : undefined;
}

function _isDeniedFunctionName(name: string): boolean {
  const lowerName = name.toLowerCase();
  return (
    DENIED_FUNCTION_NAMES.prefixes.some((prefix) => {
      return lowerName.startsWith(prefix);
    }) ||
    DENIED_FUNCTION_NAMES.exact.some((exactName) => {
      return lowerName === exactName;
    })
  );
}

/**
 * The first denied function name called anywhere in a parsed node, including
 * nested arguments and `OVER` windows. Undefined when there is none.
 */
function _findDeniedFunctionName(node: unknown): string | undefined {
  if (typeof node !== "object" || node === null) {
    return undefined;
  }
  const nodeType: unknown = Reflect.get(node, "type");
  if (typeof nodeType === "string" && FUNCTION_NODE_TYPES.has(nodeType)) {
    const name = _getFunctionNameOrUndefined(node);
    if (name !== undefined && _isDeniedFunctionName(name)) {
      return name;
    }
  }
  return Object.values(node).reduce<string | undefined>((found, child) => {
    return found ?? _findDeniedFunctionName(child);
  }, undefined);
}

function _parseSqlOrUndefined(
  sql: string,
  database: (typeof PARSER_DATABASES)[number],
): AST | AST[] | undefined {
  try {
    return new Parser().astify(sql, { database });
  } catch {
    return undefined;
  }
}

function _hasNestedSelect(node: unknown): boolean {
  if (Array.isArray(node)) {
    return node.some(_hasNestedSelect);
  }
  if (typeof node !== "object" || node === null) {
    return false;
  }
  return (
    ("type" in node && node.type === "select") ||
    Object.values(node).some(_hasNestedSelect)
  );
}

function _isStarColumn(column: unknown): boolean {
  if (typeof column !== "object" || column === null || !("expr" in column)) {
    return false;
  }
  const { expr } = column;
  return (
    typeof expr === "object" &&
    expr !== null &&
    "column" in expr &&
    expr.column === "*"
  );
}

/**
 * Reads `key` from `value` when it is an object, undefined otherwise. Used for
 * `Select` fields the parser fills in but the `Select` type omits or types
 * differently, such as `into`, `top`, and the object form of `distinct`.
 */
function _getKeyOrUndefined(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null
    ? Reflect.get(value, key)
    : undefined;
}

function _hasModifier(select: Select): boolean {
  return (
    _getKeyOrUndefined(select.distinct, "type") != null ||
    _getKeyOrUndefined(select, "top") != null ||
    _getKeyOrUndefined(_getKeyOrUndefined(select, "into"), "expr") != null ||
    select.window != null ||
    select.qualify != null
  );
}

function _hasClause(select: Select): boolean {
  return (
    select.from !== null ||
    select.where !== null ||
    (select.groupby?.columns ?? null) !== null ||
    select.having !== null ||
    select.orderby !== null ||
    select.with !== null ||
    select._next !== undefined ||
    select.set_op !== undefined ||
    (select.limit?.value.length ?? 0) > 0 ||
    _hasModifier(select)
  );
}

function _isSingleExpressionSelect(parsed: AST | AST[]): boolean {
  const statements = Array.isArray(parsed) ? parsed : [parsed];
  const [statement] = statements;
  if (statements.length !== 1 || statement?.type !== "select") {
    return false;
  }
  const [column] = statement.columns;
  return (
    statement.columns.length === 1 &&
    !_isStarColumn(column) &&
    !column?.as &&
    !_hasClause(statement) &&
    !_hasNestedSelect(statement.columns)
  );
}

/**
 * Throws `PluginError("InvalidExpression")` unless `expression` is exactly
 * one SQL scalar or window expression: no alias, no clause, no subquery, no
 * second expression, no `;` or comment, and no call to a function in
 * `DENIED_FUNCTION_NAMES` (file readers, `query`, settings, and the like).
 * Used before a plugin's expression is spliced into the Data Explorer's SQL,
 * so it can only add a column and never change what the query reads.
 */
export function assertSingleSqlExpression(expression: string): void {
  if (
    FORBIDDEN_SQL_TOKENS.some((token) => {
      return expression.includes(token);
    })
  ) {
    throw new PluginError(
      "InvalidExpression",
      `The expression must not contain ";", "--", or "/*": ${expression}`,
    );
  }
  const sql = `SELECT ${expression}`;
  const parsed = PARSER_DATABASES.reduce<AST | AST[] | undefined>(
    (result, database) => {
      return result ?? _parseSqlOrUndefined(sql, database);
    },
    undefined,
  );
  if (parsed === undefined || !_isSingleExpressionSelect(parsed)) {
    throw new PluginError(
      "InvalidExpression",
      `The expression must be one SQL scalar or window expression, with no alias, clause, or subquery: ${expression}`,
    );
  }
  const deniedName = _findDeniedFunctionName(parsed);
  if (deniedName !== undefined) {
    throw new PluginError(
      "InvalidExpression",
      `The expression must not call ${deniedName}, which can read files, run SQL, or change state: ${expression}`,
    );
  }
}
