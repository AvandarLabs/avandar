/**
 * Checks if `value` is an array.
 * This is better than `Array.isArray` because it is more type-safe and
 * uses `unknown` rather than `any`.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is an array, `false` otherwise.
 */

export function isArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}
