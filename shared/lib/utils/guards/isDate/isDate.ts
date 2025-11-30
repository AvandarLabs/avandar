/**
 * Checks if `value` is a `Date` instance.
 *
 * **Examples**
 *
 * ```ts
 * isDate(new Date()); // true
 * isDate("2023-01-01"); // false
 * isDate(null); // false
 * isDate(undefined); // false
 * ```
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date;
}
