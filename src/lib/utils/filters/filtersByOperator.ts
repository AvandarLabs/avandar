import { UnknownObject } from "@/lib/types/common";
import { isEmptyObject } from "../guards/guards";
import { objectKeys } from "../objects/misc";
import {
  ArrayValueOperator,
  FILTER_TYPES_SET,
  FilterOperator,
  SingleValueOperator,
} from "./filterTypes";
import type { FiltersByColumn } from "./filtersByColumn";

/**
 * A map of filters structured by filter operator.
 * Each operator maps to an array of key-value pairs. Each tuple
 * contains the object key (column) to filter by and the value to test
 * against.
 *
 * For example:
 * ```ts
 * const filter = {
 *   eq: [
 *     ["id", "abc-123"],
 *   ],
 * }
 * ```
 *
 * NOTE:
 * - Each operator can only have a single target value.
 * - Any ArrayValueOperators can only have a single target array.
 * - All filters are automatically ANDed together.
 * - If a column appears multiple times in the same operator, we will
 * only apply the last filter.
 *
 * TODO(jpsyx): when the FiltersByColumn type allows for multiple target
 * values, we can update this to allow a column to appear multiple times
 * in the same operator.
 */
export type FiltersByOperator<T extends UnknownObject> = Partial<
  & Record<SingleValueOperator, ColumnTargetValuePairs<T>>
  & Record<ArrayValueOperator, ColumnTargetValueArrayPairs<T>>
>;

type ColumnTargetValuePairs<T extends UnknownObject> = Array<
  { [K in keyof T]: [column: K, targetValue: T[K] | undefined] }[keyof T]
>;

type ColumnTargetValueArrayPairs<T extends UnknownObject> = Array<
  {
    [K in keyof T]: [column: K, targetValues: ReadonlyArray<T[K] | undefined>];
  }[keyof T]
>;

export function isFiltersByOperatorObject<T extends UnknownObject>(
  filters: FiltersByOperator<T> | FiltersByColumn<T>,
): filters is FiltersByOperator<T> {
  if (isEmptyObject(filters)) {
    // technically an empty object counts as a FiltersByOperator type because
    // the full type is a partial
    return true;
  }

  // every key must be a filter operator
  return objectKeys(filters).every((key) => {
    return FILTER_TYPES_SET.has(key as FilterOperator);
  });
}
