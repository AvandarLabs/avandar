import type { UnknownObject } from "@utils/types/common.types.ts";

export const SINGLE_VALUE_OPERATORS = ["eq"] as const;
export const ARRAY_VALUE_OPERATORS = ["in"] as const;
export const NULL_OPERATORS = ["is"] as const;

/**
 * These are filter operators that are evaluated against a single value.
 */
export type SingleValueOperator = (typeof SINGLE_VALUE_OPERATORS)[number];

/**
 * These are filter operators that are evaluated against an array of values.
 */
export type ArrayValueOperator = (typeof ARRAY_VALUE_OPERATORS)[number];

/**
 * These are filter operators whose only value is `null`. `eq` with `null` is
 * not SQL `is null`, so matching an empty column needs its own operator.
 */
export type NullOperator = (typeof NULL_OPERATORS)[number];

/** All supported filter operators */
export type FilterOperator =
  | SingleValueOperator
  | ArrayValueOperator
  | NullOperator;

export const FILTER_TYPES = [
  ...SINGLE_VALUE_OPERATORS,
  ...ARRAY_VALUE_OPERATORS,
  ...NULL_OPERATORS,
] as const;
export const FILTER_TYPES_SET: Set<FilterOperator> = new Set(FILTER_TYPES);

export type FilterOperatorRecord<TargetValue> = Partial<
  Record<SingleValueOperator, TargetValue | undefined>
> &
  Partial<Record<ArrayValueOperator, ReadonlyArray<TargetValue | undefined>>> &
  Partial<Record<NullOperator, null>>;

export type FiltersByColumn<T extends UnknownObject> = {
  [K in keyof T]?: FilterOperatorRecord<T[K]>;
};

type ColumnTargetValuePairs<T extends UnknownObject> = Array<
  { [K in keyof T]: [column: K, targetValue: T[K] | undefined] }[keyof T]
>;

type ColumnTargetValueArrayPairs<T extends UnknownObject> = Array<
  {
    [K in keyof T]: [column: K, targetValues: ReadonlyArray<T[K] | undefined>];
  }[keyof T]
>;

type ColumnNullPairs<T extends UnknownObject> = Array<
  { [K in keyof T]: [column: K, targetValue: null] }[keyof T]
>;

export type FiltersByOperator<T extends UnknownObject> = Partial<
  Record<SingleValueOperator, ColumnTargetValuePairs<T>> &
    Record<ArrayValueOperator, ColumnTargetValueArrayPairs<T>> &
    Record<NullOperator, ColumnNullPairs<T>>
>;
