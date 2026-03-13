import { isArray } from "../isArray/isArray.ts";

/**
 * Checks if `value` is a non-empty array.
 *
 * This is easy enough to check with just `.length` but this function gives
 * enforces at the type-level that there **must** be at least one element.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is a non-empty array, `false` otherwise.
 */

export function isNonEmptyArray<T>(
  value: readonly T[] | null | undefined,
): value is readonly [T, ...T[]] {
  return isArray(value) && value.length > 0;
}
