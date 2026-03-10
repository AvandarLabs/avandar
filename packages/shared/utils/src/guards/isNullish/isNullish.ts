/**
 * Checks if `value` is `null` or `undefined`.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is `null` or `undefined`, `false` otherwise.
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === undefined || value === null;
}
