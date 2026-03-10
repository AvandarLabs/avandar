/**
 * Asserts that `value` is not null or undefined.
 * @param value The value to assert
 * @throws Error if `value` is null or undefined
 */
export function assertIsNonNullish<T>(
  value: T | null | undefined,
  msg: string = "Expected value to be defined",
): asserts value is Exclude<T, null | undefined> {
  if (value === null || value === undefined) {
    throw new Error(msg);
  }
}
