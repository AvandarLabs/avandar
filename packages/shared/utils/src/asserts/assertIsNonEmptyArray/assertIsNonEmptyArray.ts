/**
 * Asserts that `value` is a non-empty array.
 * @param value The value to assert
 * @throws Error if `value` is nullish or an empty array
 */
export function assertIsNonEmptyArray<T>(
  value: readonly T[] | null | undefined,
  msg: string = "Expected value to be non-empty",
): asserts value is readonly [T, ...T[]] {
  if (value === undefined || value === null || value.length === 0) {
    throw new Error(msg);
  }
}
