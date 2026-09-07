import { isPlainObject } from "@avandar/utils";
import type { QueryAggregationTypeT } from "$/models/queries/QueryAggregationType/QueryAggregationType.types.ts";
import type { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

/**
 * Maps the AST's aggregation function name onto our QueryAggregationType.
 */
export function matchAggregation(
  name: string,
): QueryAggregationTypeT | undefined {
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

export function identifierToString(value: unknown): string | undefined {
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
export function columnRefName(node: unknown): string | undefined {
  if (node === null || typeof node !== "object") {
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  if (obj.type !== "column_ref") {
    return undefined;
  }
  return identifierToString(obj.column);
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
  "NOT BETWEEN": "not_between",
  IS: "is_null",
};

/**
 * Translate a parser binary operator to a {@link QueryFilterOperator}.
 */
export function toFilterOperator(
  operator: string,
): QueryFilterOperator | undefined {
  return _FILTER_OPERATOR_BY_SQL[operator.toUpperCase()];
}

export function literalValue(
  node: unknown,
): string | number | boolean | null | undefined {
  if (node === null || typeof node !== "object") {
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  // `CAST(<literal> AS DATE)`, which is how temporal rules are rendered.
  if (obj.type === "cast") {
    return literalValue(obj.expr);
  }
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

export function extractValueList(
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
  // Each element may be wrapped in `lower(...)` when the rule folds case.
  const literals = items.map((item) => {
    return literalValue(unwrapLowerCall(item).inner);
  });
  const hasInvalid = literals.some((lit) => {
    return lit === undefined || lit === null || typeof lit === "boolean";
  });
  if (hasInvalid) {
    return undefined;
  }
  return literals as Array<string | number>;
}

/** The lower-cased name of a function-call node, if it is one. */
export function getFunctionNameFromAstNode(node: unknown): string | undefined {
  if (!isPlainObject(node) || node.type !== "function") {
    return undefined;
  }
  const name = node.name as { name?: Array<{ value?: unknown }> } | undefined;
  const first = name?.name?.[0]?.value;
  return typeof first === "string" ? first.toLowerCase() : undefined;
}

/** The argument list of a function-call node. */
export function getFunctionArgsFromAstNode(node: unknown): unknown[] {
  if (!isPlainObject(node)) {
    return [];
  }
  const args = node.args as { value?: unknown[] } | undefined;
  return Array.isArray(args?.value) ? args.value : [];
}

/**
 * Unwraps a single `lower(...)` call. `wasLowered` is how the parser recovers
 * whether a rule was authored case-insensitively.
 */
export function unwrapLowerCall(node: unknown): {
  inner: unknown;
  wasLowered: boolean;
} {
  if (getFunctionNameFromAstNode(node) === "lower") {
    const [inner] = getFunctionArgsFromAstNode(node);
    return { inner, wasLowered: true };
  }
  return { inner: node, wasLowered: false };
}

/** True when the node is the literal empty string. */
export function isEmptyStringLiteral(node: unknown): boolean {
  return literalValue(node) === "";
}

/** The boolean a `bool` literal node carries, if it is one. */
export function getBoolFromAstNode(node: unknown): boolean | undefined {
  return isPlainObject(node) &&
    node.type === "bool" &&
    typeof node.value === "boolean"
    ? node.value
    : undefined;
}

/**
 * Matches `coalesce(trim(<column>), '')`, the shape `is_blank` renders. Returns
 * the column name when it matches.
 */
export function getBlankCheckColumnNameFromAstNode(
  node: unknown,
): string | undefined {
  if (getFunctionNameFromAstNode(node) !== "coalesce") {
    return undefined;
  }
  const [trimCall, emptyString] = getFunctionArgsFromAstNode(node);
  if (!isEmptyStringLiteral(emptyString)) {
    return undefined;
  }
  if (getFunctionNameFromAstNode(trimCall) !== "trim") {
    return undefined;
  }
  const [column] = getFunctionArgsFromAstNode(trimCall);
  return columnRefName(column);
}
