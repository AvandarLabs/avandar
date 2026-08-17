import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

/** How many values an operator's editor collects. */
export type QueryFilterValueArity = "none" | "scalar" | "list" | "pair";

export type QueryFilterOperatorSpec = {
  operator: QueryFilterOperator;
  arity: QueryFilterValueArity;
  /** True when the operator is offered for this column type. */
  appliesTo: (dataType: AvaDataTypeNs.T) => boolean;
  /** True when the per-rule `Match case` toggle changes this operator's SQL. */
  supportsMatchCase: boolean;
  /**
   * Legacy operators are still rendered and parsed, but never offered in the
   * operator dropdown.
   */
  legacy?: boolean;
};

function _always(): boolean {
  return true;
}

function _isText(dataType: AvaDataTypeNs.T): boolean {
  return AvaDataType.isText(dataType);
}

function _isOrderable(dataType: AvaDataTypeNs.T): boolean {
  return AvaDataType.isNumeric(dataType) || AvaDataType.isTemporal(dataType);
}

function _isBoolean(dataType: AvaDataTypeNs.T): boolean {
  return dataType === "boolean";
}

/**
 * Every operator the filter layer supports, in the order the UI offers them.
 *
 * This is the single source of truth: the operator dropdown reads it, the SQL
 * renderer switches on it, and the SQL-to-form round-trip test iterates it, so
 * an operator cannot be added in one place and forgotten in another.
 */
export const QUERY_FILTER_OPERATOR_SPECS: readonly QueryFilterOperatorSpec[] = [
  { operator: "=", arity: "scalar", appliesTo: _always, supportsMatchCase: true },
  {
    operator: "!=",
    arity: "scalar",
    appliesTo: _always,
    supportsMatchCase: true,
  },
  {
    operator: ">",
    arity: "scalar",
    appliesTo: _isOrderable,
    supportsMatchCase: false,
  },
  {
    operator: ">=",
    arity: "scalar",
    appliesTo: _isOrderable,
    supportsMatchCase: false,
  },
  {
    operator: "<",
    arity: "scalar",
    appliesTo: _isOrderable,
    supportsMatchCase: false,
  },
  {
    operator: "<=",
    arity: "scalar",
    appliesTo: _isOrderable,
    supportsMatchCase: false,
  },
  {
    operator: "contains",
    arity: "scalar",
    appliesTo: _isText,
    supportsMatchCase: true,
  },
  {
    operator: "not_contains",
    arity: "scalar",
    appliesTo: _isText,
    supportsMatchCase: true,
  },
  {
    operator: "starts_with",
    arity: "scalar",
    appliesTo: _isText,
    supportsMatchCase: true,
  },
  {
    operator: "not_starts_with",
    arity: "scalar",
    appliesTo: _isText,
    supportsMatchCase: true,
  },
  {
    operator: "ends_with",
    arity: "scalar",
    appliesTo: _isText,
    supportsMatchCase: true,
  },
  {
    operator: "not_ends_with",
    arity: "scalar",
    appliesTo: _isText,
    supportsMatchCase: true,
  },
  { operator: "in", arity: "list", appliesTo: _always, supportsMatchCase: true },
  {
    operator: "not_in",
    arity: "list",
    appliesTo: _always,
    supportsMatchCase: true,
  },
  {
    operator: "between",
    arity: "pair",
    appliesTo: _isOrderable,
    supportsMatchCase: false,
  },
  {
    operator: "not_between",
    arity: "pair",
    appliesTo: _isOrderable,
    supportsMatchCase: false,
  },
  {
    operator: "is_null",
    arity: "none",
    appliesTo: _always,
    supportsMatchCase: false,
  },
  {
    operator: "is_not_null",
    arity: "none",
    appliesTo: _always,
    supportsMatchCase: false,
  },
  {
    operator: "is_blank",
    arity: "none",
    appliesTo: _isText,
    supportsMatchCase: false,
  },
  {
    operator: "is_not_blank",
    arity: "none",
    appliesTo: _isText,
    supportsMatchCase: false,
  },
  {
    operator: "is_true",
    arity: "none",
    appliesTo: _isBoolean,
    supportsMatchCase: false,
  },
  {
    operator: "is_false",
    arity: "none",
    appliesTo: _isBoolean,
    supportsMatchCase: false,
  },
  {
    operator: "matches_regex",
    arity: "scalar",
    appliesTo: _isText,
    supportsMatchCase: false,
  },
  {
    operator: "not_matches_regex",
    arity: "scalar",
    appliesTo: _isText,
    supportsMatchCase: false,
  },
  {
    operator: "like",
    arity: "scalar",
    appliesTo: _isText,
    supportsMatchCase: false,
    legacy: true,
  },
  {
    operator: "not_like",
    arity: "scalar",
    appliesTo: _isText,
    supportsMatchCase: false,
    legacy: true,
  },
];

const _SPEC_BY_OPERATOR: Partial<
  Record<QueryFilterOperator, QueryFilterOperatorSpec>
> = Object.fromEntries(
  QUERY_FILTER_OPERATOR_SPECS.map((spec) => {
    return [spec.operator, spec];
  }),
);

/** Returns the spec for an operator, or `undefined` if it is unknown. */
export function operatorSpec(
  operator: QueryFilterOperator,
): QueryFilterOperatorSpec | undefined {
  return _SPEC_BY_OPERATOR[operator];
}

/**
 * The operators the UI offers for a column of this type, excluding legacy
 * operators. Falls back to the text operator set when the type is unknown,
 * because an unknown column is rendered as text by the SQL layer.
 */
export function operatorsForDataType(
  dataType: AvaDataTypeNs.T | undefined,
): readonly QueryFilterOperator[] {
  const effectiveType = dataType ?? "varchar";
  return QUERY_FILTER_OPERATOR_SPECS.filter((spec) => {
    return !spec.legacy && spec.appliesTo(effectiveType);
  }).map((spec) => {
    return spec.operator;
  });
}

/** The operator a new rule on this column type starts with. */
export function defaultOperatorForDataType(
  dataType: AvaDataTypeNs.T | undefined,
): QueryFilterOperator {
  return operatorsForDataType(dataType)[0] ?? "=";
}
