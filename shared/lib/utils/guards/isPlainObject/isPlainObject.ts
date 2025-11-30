import { UnknownObject } from "$/lib/types/common.ts";

/**
 * Inspired from Remeda's `isPlainObject`.
 * Checks if `value` is a plain object, i.e. an object with string
 * keys and values. This will not consider other entities JavaScript
 * considers an object using `typeof` (like Arrays, Maps, Sets, etc.).
 *
 * We're talking about just plain old objects defined with curly braces {}.
 *
 * **Examples**
 *
 * ```ts
 * isPlainObject({}); // true
 * isPlainObject({ foo: 'bar' }); // true
 * isPlainObject([]) // false
 * isPlainObject("foo"); // false
 * isPlainObject(new Date()) // false
 * isPlainObject(null) // false
 * ```
 */

export function isPlainObject<T>(
  value: Readonly<UnknownObject> | T,
): value is T & UnknownObject {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  // Inspired from Remeda's `isPlainObject` - this is a low-level check
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}
