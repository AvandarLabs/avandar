/**
 * Checks if `value` is not `null`.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is not `null`, `false` otherwise.
 */
export function isNotNull(value: unknown): value is Exclude<unknown, null> {
  return value !== null;
}
