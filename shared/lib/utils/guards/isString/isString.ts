/**
 * Checks if `value` is a string.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is a string, `false` otherwise.
 */

export function isString(value: unknown): value is string {
  return typeof value === "string";
}
