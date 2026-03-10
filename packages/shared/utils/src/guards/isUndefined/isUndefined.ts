/**
 * Checks if `value` is undefined.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is undefined, `false` otherwise.
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}
