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
 * Why a literal is hidden. `compared`: a direct operand of a comparison
 * whose other side reads a personal column, or a value that looks personal
 * on its own; such a value may name a person anywhere on the page.
 * `swept`: any other literal in an expression that reads a personal column,
 * such as `'month'` in `date_trunc('month', "dob")`.
 */
export type SensitiveLiteralReason = "compared" | "swept";

/**
 * What to hide in one SQL statement. `read`: the keys
 * (`SqlLiterals.getKey`) of the literals to hide, with why. `unread`: the
 * SQL could not be parsed, so every literal is hidden, except numbers of 99
 * or less when `keepsSmallNumbers` (no identifier names a personal column).
 */
export type SensitiveSqlLiterals =
  | Readonly<{
      kind: "read";
      reasons: ReadonlyMap<string, SensitiveLiteralReason>;
    }>
  | Readonly<{ kind: "unread"; keepsSmallNumbers: boolean }>;

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

/** Operators that test one side against values on the other. */
const COMPARISON_OPERATORS: ReadonlySet<string> = new Set([
  "=",
  "<>",
  "!=",
  "<",
  ">",
  "<=",
  ">=",
  "IN",
  "NOT IN",
  "LIKE",
  "NOT LIKE",
  "ILIKE",
  "NOT ILIKE",
  "SIMILAR TO",
  "NOT SIMILAR TO",
  "BETWEEN",
  "NOT BETWEEN",
  "~",
  "~*",
  "!~",
  "!~*",
  "IS",
  "IS NOT",
]);

/** AST node types the parser gives a number (`bigint` past 2^53). */
const NUMBER_LITERAL_TYPES: ReadonlySet<string> = new Set(["number", "bigint"]);

/** Connectives whose two sides are separate conditions. */
const CONNECTIVE_OPERATORS: ReadonlySet<string> = new Set(["AND", "OR", "XOR"]);

/**
 * Functions whose result is still the value they are given, up to case,
 * spacing, accents, or joining, so comparing their result names a person
 * as much as comparing the column does.
 */
const VALUE_KEEPING_FUNCTIONS: ReadonlySet<string> = new Set([
  "LOWER",
  "UPPER",
  "LCASE",
  "UCASE",
  "TRIM",
  "LTRIM",
  "RTRIM",
  "CONCAT",
  "CONCAT_WS",
  "COALESCE",
  "STRIP_ACCENTS",
  "NFC_NORMALIZE",
]);

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

/** The key of a node that is a string or number literal, if it is one. */
function _getLiteralKey(node: AstNode): string | undefined {
  if (STRING_LITERAL_TYPES.has(String(node.type))) {
    const value = String(node.value).replaceAll("''", "'");
    return SqlLiterals.getKey({ kind: "string", value });
  }
  if (NUMBER_LITERAL_TYPES.has(String(node.type))) {
    // The text scanner reads a minus sign as an operator, so keys drop it.
    const text = String(node.value).replace(/^-/, "");
    const value = SqlLiterals.getNumberValue(text);
    return SqlLiterals.getKey({ kind: "number", value });
  }
  return undefined;
}

/** The keys of the string and number literals in a subtree. */
function _getLiteralKeys(subtree: unknown): string[] {
  return _getNodes(subtree).flatMap((node) => {
    const key = _getLiteralKey(node);
    return key === undefined ? [] : [key];
  });
}

/**
 * The keys of the literals that are one side of a comparison themselves:
 * the side, an element of its list (`IN`, `BETWEEN`), or a cast of either.
 */
function _getDirectLiteralKeys(side: unknown): string[] {
  const items =
    _isAstNode(side) && side.type === "expr_list" && Array.isArray(side.value)
      ? side.value
      : [side];
  return items.flatMap((item) => {
    const literal = _isAstNode(item) && item.type === "cast" ? item.expr : item;
    const key = _isAstNode(literal) ? _getLiteralKey(literal) : undefined;
    return key === undefined ? [] : [key];
  });
}

/** True when the parser rounded a number, so its key would not match. */
function _hasRoundedNumber(ast: unknown): boolean {
  return _getNodes(ast).some((node) => {
    return (
      node.type === "number" &&
      typeof node.value === "number" &&
      Number.isInteger(node.value) &&
      !Number.isSafeInteger(node.value)
    );
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

function _readsPersonalColumn(
  subtree: unknown,
  detectors: SqlLiteralDetectors,
): boolean {
  return _getNodes(subtree).some((child) => {
    return _isPersonalReference(child, detectors);
  });
}

/**
 * True when a comparison side is a personal column's value itself: the
 * column, or the column passed through functions that keep its value
 * (case, spacing, joining). `year("dob")` is not: a year names no one.
 */
function _isPersonalValueSide(
  side: unknown,
  detectors: SqlLiteralDetectors,
): boolean {
  if (!_isAstNode(side)) {
    return false;
  }
  if (side.type === "column_ref" || side.type === "function") {
    if (_isPersonalReference(side, detectors)) {
      return true;
    }
  }
  const isValueKeeping =
    side.type === "cast" ||
    (side.type === "binary_expr" && side.operator === "||") ||
    (side.type === "function" &&
      VALUE_KEEPING_FUNCTIONS.has(_getFunctionName(side) ?? ""));
  return (
    isValueKeeping &&
    [side.expr, side.left, side.right, side.args]
      .flatMap((child) => {
        return _isAstNode(child) && child.type === "expr_list"
          ? (child.value as unknown[])
          : [child];
      })
      .some((child) => {
        return _isPersonalValueSide(child, detectors);
      })
  );
}

/**
 * The literals a node tests a personal column's value against directly:
 * the other side of a comparison, or the WHEN values of a simple CASE.
 */
function _getComparedKeys(
  node: AstNode,
  detectors: SqlLiteralDetectors,
): string[] {
  if (
    node.type === "binary_expr" &&
    COMPARISON_OPERATORS.has(String(node.operator).toUpperCase())
  ) {
    return [
      ...(_isPersonalValueSide(node.left, detectors)
        ? _getDirectLiteralKeys(node.right)
        : []),
      ...(_isPersonalValueSide(node.right, detectors)
        ? _getDirectLiteralKeys(node.left)
        : []),
    ];
  }
  if (node.type === "case" && _isPersonalValueSide(node.expr, detectors)) {
    const whens = Array.isArray(node.args) ? node.args : [];
    return whens.flatMap((when) => {
      return _isAstNode(when) ? _getDirectLiteralKeys(when.cond) : [];
    });
  }
  return [];
}

/**
 * The literals that go with a personal column, and why: those tested
 * against it directly are `compared`; every other literal inside any
 * expression that reads one (directly or through a function or alias), and
 * every literal in a VALUES list (whose columns are aliases), is `swept`.
 */
function _getPersonalLiteralReasons(
  ast: unknown,
  detectors: SqlLiteralDetectors,
): Map<string, SensitiveLiteralReason> {
  const reasons = new Map<string, SensitiveLiteralReason>();
  _getNodes(ast).forEach((node) => {
    const isSwept =
      node.type === "values" ||
      (_isExpressionNode(node) && _readsPersonalColumn(node, detectors));
    if (!isSwept) {
      return;
    }
    _getLiteralKeys(node).forEach((key) => {
      reasons.set(key, reasons.get(key) ?? "swept");
    });
    _getComparedKeys(node, detectors).forEach((key) => {
      reasons.set(key, "compared");
    });
  });
  return reasons;
}

/** The most alias-of-alias steps followed, such as a CTE over a CTE. */
const MAX_ALIAS_DEPTH = 4;

/**
 * Detectors that also treat each alias of a personal column as personal,
 * so `"patient_name" AS "state"` makes a later `"state"` personal even
 * though a dataset has a `state` column.
 */
function _withPersonalAliases(
  ast: unknown,
  detectors: SqlLiteralDetectors,
): SqlLiteralDetectors {
  const aliasNodes = _getNodes(ast).filter((node) => {
    return typeof node.as === "string" && node.expr !== undefined;
  });
  const aliases = new Set<string>();
  const withAliases: SqlLiteralDetectors = {
    ...detectors,
    isSensitiveColumn: (columnName) => {
      return (
        aliases.has(columnName.toLowerCase()) ||
        detectors.isSensitiveColumn(columnName)
      );
    },
  };
  Array.from({ length: MAX_ALIAS_DEPTH }).forEach(() => {
    aliasNodes.forEach((node) => {
      if (_readsPersonalColumn(node.expr, withAliases)) {
        aliases.add(String(node.as).toLowerCase());
      }
    });
  });
  return withAliases;
}

/** The unread result for SQL that cannot be parsed. */
function _unread(
  sql: string,
  detectors: SqlLiteralDetectors,
): SensitiveSqlLiterals {
  const hasPersonalColumn = SqlLiterals.listIdentifiers(sql).some(
    detectors.isSensitiveColumn,
  );
  return { kind: "unread", keepsSmallNumbers: !hasPersonalColumn };
}

/**
 * The literals in a SQL statement that must not reach a hosted model:
 * strings and numbers in any expression that reads a personal column (a
 * comparison, function, CASE, BETWEEN, and so on, on either side), every
 * literal in a VALUES list, and strings whose value looks personal anywhere.
 * SQL the parser cannot read, that uses `E''` or dollar-quoted strings, or
 * whose numbers the parser rounded, is `unread`, so a caller hides every
 * literal instead of guessing.
 *
 * Use it before page SQL leaves the device, for example to swap a chart's
 * `"patient_name" = 'Jane Doe'` filter for a placeholder.
 */
export function findSensitiveSqlLiterals(
  sql: string,
  detectors: SqlLiteralDetectors,
): SensitiveSqlLiterals {
  if (sql.trim() === "") {
    return { kind: "read", reasons: new Map() };
  }
  const literals = SqlLiterals.list(sql);
  if (
    literals.some((literal) => {
      return literal.kind === "escapeString" || literal.kind === "dollarString";
    })
  ) {
    return _unread(sql, detectors);
  }
  let ast: unknown;
  try {
    ast = new Parser().astify(sql, { database: SQL_PARSER_DATABASE });
  } catch {
    return _unread(sql, detectors);
  }
  if (_hasRoundedNumber(ast)) {
    return _unread(sql, detectors);
  }
  const reasons = _getPersonalLiteralReasons(
    ast,
    _withPersonalAliases(ast, detectors),
  );
  literals.forEach((literal) => {
    if (
      literal.kind === "string" &&
      detectors.isSensitiveValue(literal.value)
    ) {
      reasons.set(SqlLiterals.getKey(literal), "compared");
    }
  });
  return { kind: "read", reasons };
}
