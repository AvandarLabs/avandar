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
  const literals = items.map(literalValue);
  const hasInvalid = literals.some((lit) => {
    return lit === undefined || lit === null || typeof lit === "boolean";
  });
  if (hasInvalid) {
    return undefined;
  }
  return literals as Array<string | number>;
}
