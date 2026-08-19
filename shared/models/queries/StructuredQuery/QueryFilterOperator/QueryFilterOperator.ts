import { constant, makeObject, prop, valEq } from "@avandar/utils";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType.ts";

/** How many values an operator's editor collects. */
export type QueryFilterValueArity = "none" | "scalar" | "list" | "pair";

/** Catalog entry for one filter operator: arity, type facet, and match-case. */
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

function _isOrderable(dataType: AvaDataTypeNs.T): boolean {
  return AvaDataType.isNumeric(dataType) || AvaDataType.isTemporal(dataType);
}

/** Backs `QueryFilterOperator.SPECS`, which is where this is documented. */
const _SPECS = [
  {
    operator: "=",
    arity: "scalar",
    appliesTo: constant(true),
    supportsMatchCase: true,
  },
  {
    operator: "!=",
    arity: "scalar",
    appliesTo: constant(true),
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
    appliesTo: AvaDataType.isText,
    supportsMatchCase: true,
  },
  {
    operator: "not_contains",
    arity: "scalar",
    appliesTo: AvaDataType.isText,
    supportsMatchCase: true,
  },
  {
    operator: "starts_with",
    arity: "scalar",
    appliesTo: AvaDataType.isText,
    supportsMatchCase: true,
  },
  {
    operator: "not_starts_with",
    arity: "scalar",
    appliesTo: AvaDataType.isText,
    supportsMatchCase: true,
  },
  {
    operator: "ends_with",
    arity: "scalar",
    appliesTo: AvaDataType.isText,
    supportsMatchCase: true,
  },
  {
    operator: "not_ends_with",
    arity: "scalar",
    appliesTo: AvaDataType.isText,
    supportsMatchCase: true,
  },
  {
    operator: "in",
    arity: "list",
    appliesTo: constant(true),
    supportsMatchCase: true,
  },
  {
    operator: "not_in",
    arity: "list",
    appliesTo: constant(true),
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
    appliesTo: constant(true),
    supportsMatchCase: false,
  },
  {
    operator: "is_not_null",
    arity: "none",
    appliesTo: constant(true),
    supportsMatchCase: false,
  },
  {
    operator: "is_blank",
    arity: "none",
    appliesTo: AvaDataType.isText,
    supportsMatchCase: false,
  },
  {
    operator: "is_not_blank",
    arity: "none",
    appliesTo: AvaDataType.isText,
    supportsMatchCase: false,
  },
  {
    operator: "is_true",
    arity: "none",
    appliesTo: valEq("boolean"),
    supportsMatchCase: false,
  },
  {
    operator: "is_false",
    arity: "none",
    appliesTo: valEq("boolean"),
    supportsMatchCase: false,
  },
  {
    operator: "matches_regex",
    arity: "scalar",
    appliesTo: AvaDataType.isText,
    supportsMatchCase: false,
  },
  {
    operator: "not_matches_regex",
    arity: "scalar",
    appliesTo: AvaDataType.isText,
    supportsMatchCase: false,
  },
  {
    operator: "like",
    arity: "scalar",
    appliesTo: AvaDataType.isText,
    supportsMatchCase: false,
    legacy: true,
  },
  {
    operator: "not_like",
    arity: "scalar",
    appliesTo: AvaDataType.isText,
    supportsMatchCase: false,
    legacy: true,
  },
] as const;

export type QueryFilterOperator = (typeof _SPECS)[number]["operator"];

const _SPEC_BY_OPERATOR = makeObject(_SPECS, { key: "operator" });

function _getSpec(
  operator: QueryFilterOperator,
): QueryFilterOperatorSpec | undefined {
  return _SPEC_BY_OPERATOR[operator];
}

function _isOperator(value: string): value is QueryFilterOperator {
  return value in _SPEC_BY_OPERATOR;
}

function _getForDataType(
  dataType: AvaDataTypeNs.T | undefined,
): QueryFilterOperator[] {
  const effectiveType = dataType ?? "varchar";
  return _SPECS
    .filter((spec) => {
      return !("legacy" in spec && spec.legacy === true);
    })
    .filter((spec) => {
      return spec.appliesTo(effectiveType);
    })
    .map(prop("operator"));
}

function _getDefaultForDataType(
  dataType: AvaDataTypeNs.T | undefined,
): QueryFilterOperator {
  return _getForDataType(dataType)[0] ?? "=";
}

/**
 * Offered operators as sets, for the membership test. The catalog is static and
 * the type space is tiny, so this is built once rather than per lookup: the
 * filter-tree normalizer asks the question for every rule on every edit.
 */
const _OPERATORS_BY_DATA_TYPE = new Map<string, ReadonlySet<string>>(
  AvaDataType.Types.map((dataType) => {
    return [dataType, new Set<string>(_getForDataType(dataType))];
  }),
);

function _isOfferedForDataType(
  operator: QueryFilterOperator,
  dataType: AvaDataTypeNs.T,
): boolean {
  return _OPERATORS_BY_DATA_TYPE.get(dataType)?.has(operator) === true;
}

/**
 * Reads the filter-operator catalog: arity, type fit, and match-case support.
 */
export const QueryFilterOperator = {
  /**
   * Every operator the filter layer supports, in the order the UI offers them.
   *
   * This is the single source of truth: the operator dropdown reads it, the SQL
   * renderer switches on it, and the SQL-to-form round-trip test iterates it,
   * so an operator cannot be added in one place and forgotten in another.
   */
  SPECS: _SPECS,

  /** Returns the spec for an operator, or `undefined` if it is unknown. */
  getSpec: _getSpec,

  /** True when `value` is a known filter operator, including legacy ones. */
  isOperator: _isOperator,

  /**
   * The operators the UI offers for a column of this type, excluding legacy
   * operators. Falls back to the text operator set when the type is unknown,
   * because an unknown column is rendered as text by the SQL layer.
   */
  getForDataType: _getForDataType,

  /** The operator a new rule on this column type starts with. */
  getDefaultForDataType: _getDefaultForDataType,

  /**
   * True when the operator is one this column type offers. Answers the same
   * question as `getForDataType(...).includes(...)` without building the list,
   * which matters because the filter-tree normalizer asks it per rule per edit.
   */
  isOfferedForDataType: _isOfferedForDataType,
};
