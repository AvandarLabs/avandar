import { Parser } from "node-sql-parser";
import { SqlStringLiterals } from "@/lib/agent/dataAgent/pagePrivacy/SqlStringLiterals";

/** How SQL text decides what counts as personal. */
export type SqlLiteralDetectors = Readonly<{
  /** True when values compared with this column are personal. */
  isSensitiveColumn: (columnName: string) => boolean;
  /** True when a literal's value looks personal on its own. */
  isSensitiveValue: (value: string) => boolean;
}>;

/** Literal values to hide, or `"all"` when the SQL could not be parsed. */
export type SensitiveSqlLiterals = "all" | ReadonlySet<string>;

/** Operators that compare a column with values a person could be named by. */
const COMPARISON_OPERATORS: ReadonlySet<string> = new Set([
  "=",
  "<>",
  "!=",
  "IN",
  "NOT IN",
  "LIKE",
  "NOT LIKE",
  "ILIKE",
  "NOT ILIKE",
  "SIMILAR TO",
  "NOT SIMILAR TO",
]);

/** AST node types `node-sql-parser` gives a single-quoted literal. */
const STRING_LITERAL_TYPES: ReadonlySet<string> = new Set([
  "single_quote_string",
  "string",
]);

/** The parser dialect the app uses for DuckDB SQL. */
const SQL_PARSER_DATABASE = "postgresql";

type AstNode = Record<string, unknown>;

function _isAstNode(value: unknown): value is AstNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Every AST node in a subtree, the root first. */
function _getNodes(value: unknown): AstNode[] {
  if (Array.isArray(value)) {
    return value.flatMap(_getNodes);
  }
  if (!_isAstNode(value)) {
    return [];
  }
  return [value, ...Object.values(value).flatMap(_getNodes)];
}

/** A column reference's name, whether written quoted or not. */
function _getColumnName(node: AstNode): string | undefined {
  const { column } = node;
  if (typeof column === "string") {
    return column;
  }
  const expr = _isAstNode(column) ? column.expr : undefined;
  return _isAstNode(expr) && typeof expr.value === "string"
    ? expr.value
    : undefined;
}

function _hasSensitiveColumn(
  subtree: unknown,
  isSensitiveColumn: SqlLiteralDetectors["isSensitiveColumn"],
): boolean {
  return _getNodes(subtree).some((node) => {
    const name = node.type === "column_ref" ? _getColumnName(node) : undefined;
    return name !== undefined && isSensitiveColumn(name);
  });
}

/** The unescaped values of the string literals in a subtree. */
function _getLiteralValues(subtree: unknown): string[] {
  return _getNodes(subtree).flatMap((node) => {
    return STRING_LITERAL_TYPES.has(String(node.type)) &&
      typeof node.value === "string"
      ? [node.value.replaceAll("''", "'")]
      : [];
  });
}

/**
 * The literals compared with a personal column: for each comparison, every
 * literal on one side when the other side reads a personal column, directly
 * or inside a function such as `lower("name")`.
 */
function _getComparedValues(
  ast: unknown,
  isSensitiveColumn: SqlLiteralDetectors["isSensitiveColumn"],
): string[] {
  return _getNodes(ast).flatMap((node) => {
    if (
      node.type !== "binary_expr" ||
      !COMPARISON_OPERATORS.has(String(node.operator).toUpperCase())
    ) {
      return [];
    }
    return [
      ...(_hasSensitiveColumn(node.left, isSensitiveColumn)
        ? _getLiteralValues(node.right)
        : []),
      ...(_hasSensitiveColumn(node.right, isSensitiveColumn)
        ? _getLiteralValues(node.left)
        : []),
    ];
  });
}

/**
 * The string literals in a SQL statement that must not reach a hosted model:
 * those compared with a column that looks personal (with `=`, `<>`, `!=`,
 * `IN`, `LIKE`, `ILIKE`, or their `NOT` forms, on either side), and those
 * whose value looks personal anywhere in the SQL. SQL the parser cannot read
 * gives `"all"`, so a caller hides every literal instead of guessing.
 *
 * Use it before page SQL leaves the device, for example to swap a chart's
 * `"patient_name" = 'Jane Doe'` filter for a placeholder.
 */
export function findSensitiveSqlLiterals(
  sql: string,
  detectors: SqlLiteralDetectors,
): SensitiveSqlLiterals {
  if (sql.trim() === "") {
    return new Set();
  }
  let ast: unknown;
  try {
    ast = new Parser().astify(sql, { database: SQL_PARSER_DATABASE });
  } catch {
    return "all";
  }
  return new Set([
    ..._getComparedValues(ast, detectors.isSensitiveColumn),
    ...SqlStringLiterals.getValues(sql).filter(detectors.isSensitiveValue),
  ]);
}
