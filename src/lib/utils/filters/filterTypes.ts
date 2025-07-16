import { match } from "ts-pattern";

const SINGLE_VALUE_OPERATORS = ["eq"] as const;
const ARRAY_VALUE_OPERATORS = ["in"] as const;

/**
 * These are filter operators that are evaluated against a single value.
 */
export type SingleValueOperator = (typeof SINGLE_VALUE_OPERATORS)[number];

/**
 * These are filter operators that are evaluated against an array of values.
 */
export type ArrayValueOperator = (typeof ARRAY_VALUE_OPERATORS)[number];

/** All supported filter operators */
export type FilterOperator = SingleValueOperator | ArrayValueOperator;

export const FILTER_TYPES = [
  ...SINGLE_VALUE_OPERATORS,
  ...ARRAY_VALUE_OPERATORS,
] as const;
export const FILTER_TYPES_SET: Set<FilterOperator> = new Set(FILTER_TYPES);

export const isSingleValueOperator = (
  operator: FilterOperator,
): operator is SingleValueOperator => {
  return match(operator)
    .with("eq", () => {
      return true;
    })
    .with("in", () => {
      return false;
    })
    .exhaustive();
};

export const isArrayValueOperator = (
  operator: FilterOperator,
): operator is ArrayValueOperator => {
  return match(operator)
    .with("eq", () => {
      return false;
    })
    .with("in", () => {
      return true;
    })
    .exhaustive();
};
