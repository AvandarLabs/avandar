/**
 * Checks if `value` is not `undefined`.
 *
 * NOTE: the value can still be `null`. This counts as a defined value.
 *
 * **Examples**
 *
 * ```ts
 * isDefined(undefined); // false
 * isDefined("foo"); // true
 * isDefined(0); // true
 * isDefined(false); // true
 * ```
 */
export function isDefined<T>(value: T): value is Exclude<T, undefined> {
  return value !== undefined;
}
