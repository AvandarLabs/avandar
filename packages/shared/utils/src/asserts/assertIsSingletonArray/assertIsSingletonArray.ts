/**
 * Asserts that `value` is a singleton array.
 * @param value The value to assert
 * @throws Error if `value` is nullish or not a singleton array
 */
export function assertIsSingletonArray<T>(
  value: readonly T[] | null | undefined,
  msg: string = "Expected value to be a singleton array",
): asserts value is readonly [T] {
  if (value === undefined || value === null || value.length !== 1) {
    throw new Error(msg);
  }
}
