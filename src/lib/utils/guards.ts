import { EmptyObject, SetRequired } from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { AnyFunction, SetDefined } from "../types/utilityTypes";

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

/**
 * Checks if `value` is not `undefined`.
 *
 * **Examples**
 *
 * ```ts
 * isNotUndefined(undefined); // false
 * isNotUndefined("foo"); // true
 * isNotUndefined(0); // true
 * isNotUndefined(false); // true
 * ```
 */
export function isNotUndefined<T>(value: T): value is Exclude<T, undefined> {
  return value !== undefined;
}

export function isNullish(value: unknown): value is null | undefined {
  return value === undefined || value === null;
}

export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

export function isNull(value: unknown): value is null {
  return value === null;
}

export function isNotNull(value: unknown): value is Exclude<unknown, null> {
  return value !== null;
}

/**
 * Checks if `value` is a function.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is a function, `false` otherwise.
 */
export function isFunction(value: unknown): value is AnyFunction {
  return typeof value === "function";
}

/**
 * Checks if `value` is a number.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is a number, `false` otherwise.
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

/**
 * Checks if `value` is a string.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is a string, `false` otherwise.
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isPrimitive(
  value: unknown,
): value is string | number | bigint | boolean | symbol | undefined | null {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "symbol" ||
    typeof value === "undefined" ||
    value === null
  );
}

/**
 * Checks if `obj` has all the properties in `properties`.
 *
 * This is useful when an object has optional properties but you want to assert
 * that these values are present.
 *
 * NOTE: this only checks for property existence. The property can exist but
 * the value can still be undefined.
 *
 * @param obj - The object to check.
 * @param properties - The properties to check.
 * @returns `true` if `obj` has all the properties in `properties`, `false`
 * otherwise.
 */
export function hasPropKeys<T extends UnknownObject, Key extends keyof T>(
  obj: T | null | undefined,
  properties: Key[],
): obj is T & SetRequired<T, Key> {
  if (obj === null || obj === undefined) {
    return false;
  }
  return properties.every((prop) => {
    return prop in obj;
  });
}

/**
 * Checks if `obj` has all the properties in `properties` and that they are
 * not undefined.
 *
 * NOTE: this guard only works properly for strictly defined objects and keys
 * as literals. For objects with indexers or keys as broad strings, you should
 * do a manual check instead of using this guard.
 *
 * NOTE: this still allows `null` values. This literally just checks that it's
 * not `undefined`.
 *
 * @param obj - The object to check.
 * @param properties - The properties to check.
 * @returns `true` if `obj` has all the properties in `properties` and that
 * they are not undefined, `false` otherwise.
 */
export function hasNonUndefinedProps<T extends object, Key extends keyof T>(
  obj: T,
  properties: Extract<Key, string> | readonly Key[],
): obj is SetRequired<T, Key> & SetDefined<T, Key> {
  const props = typeof properties === "string" ? [properties] : properties;
  return props.every((prop) => {
    return prop in obj && obj[prop] !== undefined;
  });
}

/**
 * Checks if `v` is an empty object.
 *
 * @param v - The value to check. It must be narrowed to an object type already.
 * @returns `true` if `v` is an empty object, `false` otherwise.
 */
export function isEmptyObject(v: UnknownObject): v is EmptyObject {
  for (const _ in v) {
    // if there is a single key we will enter this loop and return false
    return false;
  }

  return true;
}

/**
 * Checks if `value` is one of the values in `values`.
 *
 * @param value - The value to check.
 * @param values - The values to check against.
 * @returns `true` if `value` is one of the values in `values`,
 * `false` otherwise.
 */
export function isOneOf<T extends string | boolean | number>(
  value: unknown,
  values: readonly T[],
): value is T {
  return values.includes(value as T);
}

/**
 * Checks if `value` is a non-empty array.
 *
 * This is easy enough to check with just `.length` but this function gives
 * enforces at the type-level that there **must** be at least one element.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is a non-empty array, `false` otherwise.
 */
export function isNonEmptyArray<T>(
  value: readonly T[] | null | undefined,
): value is readonly [T, ...T[]] {
  return isArray(value) && value.length > 0;
}
