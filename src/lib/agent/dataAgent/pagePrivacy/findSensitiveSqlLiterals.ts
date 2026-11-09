import { Parser } from "node-sql-parser";
import { SqlLiterals } from "$/agent/pageContext/SqlLiterals";

/** How SQL text decides what counts as personal. */
export type SqlLiteralDetectors = Readonly<{
  /** True when values compared with this column are personal. */
  isSensitiveColumn: (columnName: string) => boolean;
  /** True when a string literal's value looks personal on its own. */
  isSensitiveValue: (value: string) => boolean;
  /**
   * The page's dataset column names, lowercased. When given, a column
   * reference that is none of them (a CTE, subquery, or VALUES alias) counts
   * as personal, since it may stand for a personal column.
   */
  knownColumnNames?: ReadonlySet<string>;
}>;

/**
 * Keys (`SqlLiterals.getKey`) of the literals to hide, or `"all"` when the
 * SQL could not be read.
 */
export type SensitiveSqlLiterals = "all" | ReadonlySet<string>;

/** The parser dialect the app uses for DuckDB SQL. */
const SQL_PARSER_DATABASE = "postgresql";

/** AST node types that hold a string value a person could be named by. */
const STRING_LITERAL_TYPES: ReadonlySet<string> = new Set([
  "single_quote_string",
  "string",
  "date",
  "time",
  "timestamp",
  "datetime",
]);

/**
 * AST node types that are whole statements, not expressions. A statement
 * that reads a personal column says nothing about its other literals.
 */
const STATEMENT_TYPES: ReadonlySet<string> = new Set([
  "select",
  "insert",
  "update",
  "delete",
  "create",
  "drop",
  "alter",
]);

/** Connectives whose two sides are separate conditions. */
const CONNECTIVE_OPERATORS: ReadonlySet<string> = new Set(["AND", "OR", "XOR"]);

/** Functions that pick columns by a name written as a literal. */
const COLUMN_PICKING_FUNCTIONS: ReadonlySet<string> = new Set(["COLUMNS"]);

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

/** A function call's name in upper case, such as `COLUMNS`. */
function _getFunctionName(node: AstNode): string | undefined {
  const parts = _isAstNode(node.name) ? node.name.name : undefined;
  const first = Array.isArray(parts) ? parts[0] : undefined;
  return _isAstNode(first) && typeof first.value === "string"
    ? first.value.toUpperCase()
    : undefined;
}

/** True when a node reads, or may read, a personal column. */
function _isPersonalReference(
  node: AstNode,
  detectors: SqlLiteralDetectors,
): boolean {
  if (node.type === "function") {
    return COLUMN_PICKING_FUNCTIONS.has(_getFunctionName(node) ?? "");
  }
  if (node.type !== "column_ref") {
    return false;
  }
  const name = _getColumnName(node);
  if (name === undefined || name === "*") {
    return false;
  }
  const { knownColumnNames } = detectors;
  return (
    detectors.isSensitiveColumn(name) ||
    (knownColumnNames !== undefined &&
      !knownColumnNames.has(name.toLowerCase()))
  );
}

/** The keys of the string and number literals in a subtree. */
function _getLiteralKeys(subtree: unknown): string[] {
  return _getNodes(subtree).flatMap((node) => {
    if (STRING_LITERAL_TYPES.has(String(node.type))) {
      const value = String(node.value).replaceAll("''", "'");
      return [SqlLiterals.getKey({ kind: "string", value })];
    }
    if (node.type === "number") {
      const value = String(Math.abs(Number(node.value)));
      return [SqlLiterals.getKey({ kind: "number", value })];
    }
    return [];
  });
}

/**
 * True for an expression node whose literals all go with it: anything but a
 * statement, an AND/OR between separate conditions, or a bare literal or
 * column. Every operator, function, CASE, cast, and BETWEEN counts, so an
 * unfamiliar construct fails closed.
 */
function _isExpressionNode(node: AstNode): boolean {
  const type = String(node.type ?? "");
  if (type === "" || STATEMENT_TYPES.has(type) || type === "column_ref") {
    return false;
  }
  return !(
    type === "binary_expr" &&
    CONNECTIVE_OPERATORS.has(String(node.operator).toUpperCase())
  );
}

/**
 * The literals that go with a personal column: every literal inside any
 * expression that reads one, directly or through a function or alias, and
 * every literal in a VALUES list (whose columns are aliases).
 */
function _getPersonalLiteralKeys(
  ast: unknown,
  detectors: SqlLiteralDetectors,
): string[] {
  return _getNodes(ast).flatMap((node) => {
    if (node.type === "values") {
      return _getLiteralKeys(node);
    }
    const readsPersonalColumn =
      _isExpressionNode(node) &&
      _getNodes(node).some((child) => {
        return _isPersonalReference(child, detectors);
      });
    return readsPersonalColumn ? _getLiteralKeys(node) : [];
  });
}

/**
 * The literals in a SQL statement that must not reach a hosted model:
 * strings and numbers in any expression that reads a personal column (a
 * comparison, function, CASE, BETWEEN, and so on, on either side), every
 * literal in a VALUES list, and strings whose value looks personal anywhere.
 * SQL the parser cannot read, or that uses `E''` or dollar-quoted strings,
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
  const literals = SqlLiterals.list(sql);
  if (
    literals.some((literal) => {
      return literal.kind === "escapeString" || literal.kind === "dollarString";
    })
  ) {
    return "all";
  }
  let ast: unknown;
  try {
    ast = new Parser().astify(sql, { database: SQL_PARSER_DATABASE });
  } catch {
    return "all";
  }
  return new Set([
    ..._getPersonalLiteralKeys(ast, detectors),
    ...literals
      .filter((literal) => {
        return (
          literal.kind === "string" && detectors.isSensitiveValue(literal.value)
        );
      })
      .map(SqlLiterals.getKey),
  ]);
}
