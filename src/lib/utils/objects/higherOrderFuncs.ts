import { Paths, SetRequired } from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { SetDefined } from "@/lib/types/utilityTypes";
import { hasDefinedProp } from "../guards";
import { getValue, PathValue } from "./getValue";
import { omit, pick } from "./misc";
import {
  ExcludeNullsExceptFrom,
  excludeNullsExceptFrom,
  ExcludeNullsFrom,
  excludeNullsFrom,
} from "./transformations";

/**
 * Returns a getter function that returns the value of a property at a given
 * key path in dot notation.
 *
 * @param path The path of the property to get.
 * @returns A function that returns the value at the given key path.
 */
export function getProp<
  T extends object,
  K extends [Paths<T>] extends [never] ? keyof T : Paths<T>,
  V extends K extends keyof T ? T[K]
  : K extends Paths<T> ? PathValue<T, K>
  : never,
>(path: K): (obj: T) => V {
  return (obj: T) => {
    if (String(path).includes(".")) {
      return getValue(obj, path);
    }
    return obj[path as keyof T] as V;
  };
}

/**
 * Returns a function that checks if an object has a property with a specific
 * value.
 *
 * @param path The path of the property to check.
 * @param value The value to check.
 * @returns A function that returns true if the object has the property with
 * the specified value.
 */
export function propEquals<
  T extends object,
  K extends [Paths<T>] extends [never] ? keyof T : Paths<T>,
  V extends K extends keyof T ? T[K]
  : K extends Paths<T> ? PathValue<T, K>
  : never,
>(path: K, value: V): (obj: T) => boolean {
  return (obj: T) => {
    if (String(path).includes(".")) {
      return getValue(obj, path) === value;
    }
    return obj[path as keyof T] === value;
  };
}

/**
 * Returns a function that checks if an object has a property that **doesn't**
 * have a specific value.
 *
 * @param path The path of the property to check.
 * @param value The value to check.
 * @returns A function that returns true if the object has the property with
 * the specified value.
 */
export function propDoesntEqual<
  T extends object,
  K extends [Paths<T>] extends [never] ? keyof T : Paths<T>,
  V extends K extends keyof T ? T[K]
  : K extends Paths<T> ? PathValue<T, K>
  : never,
>(path: K, value: V): (obj: T) => boolean {
  return (obj: T) => {
    if (String(path).includes(".")) {
      return getValue(obj, path) !== value;
    }
    return obj[path as keyof T] !== value;
  };
}

/**
 * Returns a function that checks if an object has a property that is defined.
 *
 * @param path The path of the property to check.
 * @returns A function that returns true if the object has the property with
 * the specified value.
 */
export function propIsDefined<T extends object, K extends keyof T>(
  path: K,
): (obj: T) => obj is SetRequired<T, K> & SetDefined<T, K> {
  return (obj: T) => {
    return hasDefinedProp(obj, path);
  };
}

/**
 * Returns a function that removes the specified keys from an object.
 * @param keys The keys to remove from the object.
 * @returns A function that removes the specified keys from an object.
 */
export function omitProps<T extends UnknownObject, K extends keyof T>(
  keys: Extract<K, string> | readonly K[],
): (obj: T) => Omit<T, K> {
  return (obj: T) => {
    return omit(obj, keys);
  };
}

/**
 * Returns a function that picks the specified keys from an object.
 * @param keys The keys to pick from the object.
 * @returns A function that picks the specified keys from an object.
 */
export function pickProps<T extends UnknownObject, K extends keyof T>(
  keys: Extract<K, string> | readonly K[],
): (obj: T) => Pick<T, K> {
  return (obj: T) => {
    return pick(obj, keys);
  };
}

/**
 * Returns a function that excludes nulls from the specified keys.
 * If no keys are specified, we assume `keysToTest` is the entire
 * object, so we will exclude nulls from all keys.
 *
 * This is a shallow operation.
 *
 * @param obj The object to exclude nulls from.
 * @param keysToTest The keys to test for null values.
 * @returns A new object with nulls excluded from the specified keys.
 */
export function excludeNullsFromProps<
  T extends UnknownObject,
  K extends keyof T,
>(...keysToTest: readonly K[]): (obj: T) => ExcludeNullsFrom<T, K> {
  return (obj: T) => {
    return excludeNullsFrom(obj, ...keysToTest);
  };
}

/**
 * Returns a function that excludes nulls from all keys except the
 * specified keys. Those keys will be left unchanged.
 *
 * If no keys are specified, we assume `keysToKeepNull` is the entire
 * object. Therefore, the object is left unchanged.
 *
 * This is a shallow operation.
 *
 * @param keys The keys to exclude nulls from.
 * @returns A function that excludes nulls from the specified keys.
 */
export function excludeNullsExceptFromProps<
  T extends UnknownObject,
  K extends keyof T,
>(...keysToKeepNull: readonly K[]): (obj: T) => ExcludeNullsExceptFrom<T, K> {
  return (obj: T) => {
    return excludeNullsExceptFrom(obj, ...keysToKeepNull);
  };
}
