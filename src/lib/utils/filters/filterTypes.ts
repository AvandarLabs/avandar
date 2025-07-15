import { match } from "ts-pattern";
import { UnionToTuple } from "type-fest";

/**
 * These are filter operators that are evaluated against a single value.
 */
export type SingleValueOperator = "eq";

/**
 * These are filter operators that are evaluated against an array of values.
 */
export type ArrayValueOperator = "in";

/** All supported filter operators */
export type FilterOperator = SingleValueOperator | ArrayValueOperator;

export const FILTER_TYPES = [
  "eq",
  "in",
] as const satisfies UnionToTuple<FilterOperator>;
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
