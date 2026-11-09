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
    (select.limit?.value.length ?? 0) > 0
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
 * second expression, and no `;` or comment. Used before a plugin's
 * expression is spliced into the Data Explorer's SQL, so it can only add a
 * column and never change what the query reads.
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
}
