import { UnknownObject } from "@/lib/types/common";
import { isEmptyObject } from "../guards";
import { isFiltersByOperatorObject } from "./filtersByOperator";
import type { FiltersByOperator } from "./filtersByOperator";
import type { ArrayValueOperator, SingleValueOperator } from "./filterTypes";

/**
 * A map of filters structured by object key.
 * Each key maps to a record of filter operators with their target value
 * to filter by.
 *
 * For example:
 * ```ts
 * const filter = {
 *   id: { eq: "abc-123" },
 * }
 * ```
 *
 * NOTE:
 * - Each operator can only have a single target value.
 * - Any ArrayValueOperators can only have a single target array.
 * - All filters are automatically ANDed together.
 *
 * TODO(jpsyx): allow each operator to have multiple target values.
 *
 * Importantly, `undefined` is a valid filter value. If a filter operator is set
 * to `undefined` then the operator will still get applied.
 *
 * For example:
 * ```ts
 * const filter = {
 *   id: { eq: undefined },
 * }
 * ```
 *
 * This will filter for ids that are `undefined`. If you want to make sure the
 * `eq` filter is not applied then you need to unset the `eq` operator.
 */
export type FiltersByColumn<T extends UnknownObject> = {
  [K in keyof T]?: FilterOperatorRecord<T[K]>;
};

/**
 * A record of filter operators to their target values to filter by.
 *
 * For example:
 * ```ts
 * { eq: "abcd" },
 * ```
 *
 * NOTE:
 * - Each operator can only have a single target value.
 * - Any ArrayValueOperators can only have a single target array.
 * - All filters are automatically ANDed together.
 *
 */
export type FilterOperatorRecord<TargetValue> = Partial<
  Record<SingleValueOperator, TargetValue | undefined>
> &
  Partial<Record<ArrayValueOperator, Array<TargetValue | undefined>>>;

export function isFiltersByColumnObject<T extends UnknownObject>(
  filters: FiltersByColumn<T> | FiltersByOperator<T>,
): filters is FiltersByColumn<T> {
  if (isEmptyObject(filters)) {
    // technically an empty object counts as a FiltersByColumn type because
    // the full type is a partial
    return true;
  }

  // if it's not a FiltersByOperator, then it must be a FiltersByColumn
  return !isFiltersByOperatorObject(filters);
}
