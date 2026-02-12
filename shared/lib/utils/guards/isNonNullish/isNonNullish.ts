/**
 * Checks if `value` is not `null` or `undefined`.
 *
 * **Examples**
 *
 * ```ts
 * isNonNullish(null); // false
 * isNonNullish(undefined); // false
 * isNonNullish("foo"); // true
 * isNonNullish(0); // true
 * isNonNullish(false); // true
 * ```
 */
export function isNonNullish<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}
