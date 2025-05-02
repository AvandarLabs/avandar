import { EmptyObject, SetRequired } from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { Logger } from "../Logger";
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
 * isNotNullOrUndefined(null); // false
 * isNotNullOrUndefined(undefined); // false
 * isNotNullOrUndefined("foo"); // true
 * isNotNullOrUndefined(0); // true
 * isNotNullOrUndefined(false); // true
 * ```
 */
export function isNotNullOrUndefined<T>(value: T): value is NonNullable<T> {
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

export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === undefined || value === null;
}

export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

export function isFunction(value: unknown): value is AnyFunction {
  return typeof value === "function";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
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
export function hasProps<T extends object, Key extends keyof T>(
  obj: T,
  ...properties: Key[]
): obj is T & SetRequired<T, Key> {
  return properties.every((prop) => {
    return prop in obj;
  });
}

/**
 * Checks if `obj` has all the properties in `properties` and that they are
 * not undefined.
 *
 * NOTE: this still allows `null` values. This literally just checks that it's
 * not `undefined`.
 *
 * @param obj - The object to check.
 * @param properties - The properties to check.
 * @returns `true` if `obj` has all the properties in `properties` and that
 * they are not undefined, `false` otherwise.
 */
export function hasDefinedProps<T extends object, Key extends keyof T>(
  obj: T,
  ...properties: Key[]
): obj is SetRequired<T, Key> & SetDefined<T, Key> {
  return properties.every((prop) => {
    return prop in obj && obj[prop] !== undefined;
  });
}

/**
 * Asserts that `condition` is truthy.
 *
 * @param condition - The condition to assert.
 * @param msg - The error message to throw if the condition is falsy.
 */
export function assert(condition: unknown, msg?: string): asserts condition {
  if (!condition) {
    const errMsg = msg ?? "Condition failed";
    Logger.error(errMsg);
    throw new Error(errMsg);
  }
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
