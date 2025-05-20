import { Paths, UnknownArray } from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { omit, pick } from "./misc";
import {
  ExcludeNullsExceptFrom,
  excludeNullsExceptFrom,
  ExcludeNullsFrom,
  excludeNullsFrom,
} from "./transformations";
import { PathValue, xgetValue } from "./xgetValue";

/**
 * Returns a getter function that returns the value of a property of an object.
 * @param key The key of the property to get.
 * @returns A function that returns the value of the property.
 */
export function getProp<T extends object, K extends keyof T>(
  key: K,
): (obj: T) => T[K] {
  return (obj: T) => {
    return obj[key];
  };
}

/**
 * Returns a getter function that returns the value of a property at a given
 * key path in dot notation.
 *
 * The `x` prefix is our convention to denote a function that accepts a deep
 * key path rather than a shallow key.
 *
 * @param path The path of the property to get.
 * @returns A function that returns the value at the given key path.
 */
export function xgetProp<
  T extends UnknownObject | UnknownArray,
  P extends Paths<T>,
>(path: P): (obj: T) => PathValue<T, P> {
  return (obj: T) => {
    return xgetValue(obj, path);
  };
}

/**
 * Returns a function that checks if an object has a property with a specific
 * value.
 * @param key The key of the property to check.
 * @param value The value to check.
 * @returns A function that returns true if the object has the property with
 * the specified value.
 */
export function propEquals<T extends UnknownObject, K extends keyof T>(
  key: K,
  value: T[K],
): (obj: T) => boolean {
  return (obj: T) => {
    return obj[key] === value;
  };
}

/**
 * Returns a function that checks if an object has a property with a specific
 * value.
 *
 * The `x` prefix is our convention to denote a function that accepts a deep
 * key path rather than a shallow key.
 *
 * @param path The path of the property to check.
 * @param value The value to check.
 * @returns A function that returns true if the object has the property with
 * the specified value.
 */
export function xpropEquals<T extends UnknownObject, P extends Paths<T>>(
  path: P,
  value: PathValue<T, P>,
): (obj: T) => boolean {
  return (obj: T) => {
    return xgetValue(obj, path) === value;
  };
}

/**
 * Returns a function that checks if an object has a property that **doesn't**
 * have a specific value.
 *
 * @param key The key of the property to check.
 * @param value The value to check.
 * @returns A function that returns true if the object has the property with
 * the specified value.
 */
export function propDoesntEqual<T extends UnknownObject, K extends keyof T>(
  key: K,
  value: T[K],
): (obj: T) => boolean {
  return (obj: T) => {
    return obj[key] !== value;
  };
}

/**
 * Returns a function that checks if an object has a property that **doesn't**
 * have a specific value.
 *
 * The `x` prefix is our convention to denote a function that accepts a deep
 * key path rather than a shallow key.
 *
 * @param path The path of the property to check.
 * @param value The value to check.
 * @returns A function that returns true if the object has the property with
 * the specified value.
 */
export function xpropDoesntEqual<T extends UnknownObject, P extends Paths<T>>(
  path: P,
  value: PathValue<T, P>,
): (obj: T) => boolean {
  return (obj: T) => {
    return xgetValue(obj, path) !== value;
  };
}

/**
 * Returns a function that removes the specified keys from an object.
 * @param keys The keys to remove from the object.
 * @returns A function that removes the specified keys from an object.
 */
export function omitProps<T extends UnknownObject, K extends keyof T>(
  ...keys: readonly K[]
): (obj: T) => Omit<T, K> {
  return (obj: T) => {
    return omit(obj, ...keys);
  };
}

/**
 * Returns a function that picks the specified keys from an object.
 * @param keys The keys to pick from the object.
 * @returns A function that picks the specified keys from an object.
 */
export function pickProps<T extends UnknownObject, K extends keyof T>(
  ...keys: readonly K[]
): (obj: T) => Pick<T, K> {
  return (obj: T) => {
    return pick(obj, ...keys);
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
