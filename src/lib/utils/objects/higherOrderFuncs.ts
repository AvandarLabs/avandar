import {
  ConditionalKeys,
  Paths,
  SetFieldType,
  SetRequired,
  UnknownArray,
} from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { SetDefined } from "@/lib/types/utilityTypes";
import { hasDefinedProps } from "../guards/guards";
import { getValue, PathValue } from "./getValue";
import { omit, pick } from "./misc";
import { setValue } from "./setValue";
import {
  coerceDatesIn,
  convertDatesToISOIn,
  ExcludeNullsExceptIn,
  excludeNullsExceptIn,
  ExcludeNullsIn,
  excludeNullsIn,
} from "./transformations";

/**
 * Returns a getter function that returns the value of a property at a given
 * key path in dot notation.
 *
 * @param path The path of the property to get.
 * @returns A function that returns the value at the given key path.
 */
export function prop<
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
 * Returns a function that checks if an object's property at `path` equals
 * `value`.
 *
 * @param path The path of the property to check.
 * @param value The value to check.
 * @returns A function that returns true if the value at `path` is equal to
 * `value`
 */
export function propEq<
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
 * Returns a function that checks if an object's property at `path` **doesn't**
 * equal `value`.
 *
 * @param path The path of the property to check.
 * @param value The value to check.
 * @returns A function that returns true if the property at `path` is **not**
 * equal to `value`
 */
export function propNotEq<
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
 * Returns a function that checks if an object's property at `key` is defined
 * (i.e. is not `undefined`).
 *
 * **NOTE**: we can only use top-level keys instead of dot-notation paths,
 * because we don't have a type utility to do a deep `SetDefined`.
 *
 * @param key The key of the property to check.
 * @returns A function that returns true if the property at `key` is defined.
 */
export function propIsDefined<T extends object, K extends keyof T>(
  key: K,
): (obj: T) => obj is SetRequired<T, K> & SetDefined<T, K> {
  return (obj: T) => {
    return hasDefinedProps(obj, [key]);
  };
}

export function propIsInArray<
  T extends object,
  K extends [Paths<T>] extends [never] ? keyof T : Paths<T>,
  V extends K extends keyof T ? T[K]
    : K extends Paths<T> ? PathValue<T, K>
    : never,
>(
  path: K,
  array: readonly V[],
): (obj: T) => boolean {
  return (obj: T) => {
    return array.includes(getValue(obj, path));
  };
}

/**
 * Returns a function that checks if an object's property at `key` passes a
 * `predicate`.
 *
 * This function retains type safety if the predicate that is passed is a type
 * guard.
 *
 * @param key The key of the property to check.
 * @param predicate The predicate to check the property against.
 * @returns A function that returns true if the property at `key` passes the
 * `predicate`
 */
export function propPasses<T extends object, K extends keyof T, R extends T[K]>(
  key: K,
  predicate: (value: T[K]) => value is R,
): (obj: T) => obj is T & SetFieldType<T, K, R>;
export function propPasses<T extends object, K extends keyof T>(
  key: K,
  predicate: (value: T[K]) => boolean,
): (obj: T) => boolean {
  return (obj: T) => {
    return predicate(obj[key]);
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
export function excludeNullsInProps<T extends UnknownObject, K extends keyof T>(
  keysToTest: Extract<K, string> | readonly K[],
): (obj: T) => ExcludeNullsIn<T, K> {
  return (obj: T) => {
    return excludeNullsIn(obj, keysToTest);
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
export function excludeNullsExceptInProps<
  T extends UnknownObject,
  K extends keyof T,
>(
  keysToKeepNull: Extract<K, string> | readonly K[],
): (obj: T) => ExcludeNullsExceptIn<T, K> {
  return (obj: T) => {
    return excludeNullsExceptIn(obj, keysToKeepNull);
  };
}

/**
 * Returns a function that coerces the specified keys into dates.
 *
 * @param keys The keys to coerce into dates.
 * @returns A function that coerces the specified keys into dates.
 */
export function coerceDatesInProps<T extends UnknownObject, K extends keyof T>(
  keys: readonly K[],
): (obj: T) => {
  [Key in keyof T]: Key extends K ? undefined extends T[Key] ? Date | undefined
    : Date
    : T[Key];
} {
  return (obj: T) => {
    return coerceDatesIn(obj, keys);
  };
}

/**
 * Returns a function that converts the specified keys into ISO strings.
 *
 * @param keys The keys to convert into ISO strings.
 * @returns A function that converts the specified keys into ISO strings.
 */
export function convertDatesToISOInProps<
  T extends UnknownObject,
  K extends ConditionalKeys<T, Date | undefined>,
>(
  keys: readonly K[],
): (obj: T) => {
  [Key in keyof T]: Key extends K
    ? undefined extends T[Key] ? string | undefined
    : string
    : T[Key];
} {
  return (obj: T) => {
    return convertDatesToISOIn(obj, keys);
  };
}

/**
 * Returns a function that sets the value of a property at a given key path.
 * This can set values deeply by using a dot-notation path.
 *
 * **NOTE**: the return type of this function is the same type as the input
 * object type. So you can use this function to set a value, but the type of
 * that value must still be compatible with the original type. If you wanted
 * to change the value to an incompatible type, you should use object rest
 * operators to clone the object and replace the value you need.
 *
 * @param path The key path in dot notation.
 * @param value The value to set.
 * @returns an object with the value set at the specified key path. The return
 * type will be the same as the input object type.
 */
export function setPropValue<
  T extends UnknownObject | UnknownArray,
  // We need to use this ternary expression on `K` because Paths<> returns
  // `never` on a record. E.g. Paths<string, string> = never.
  // So if `Paths<>` can't compute a set of paths, we can fall back
  // to using `keyof T` which works fine for records.
  K extends [Paths<T>] extends [never] ? keyof T : Paths<T>,
  V extends K extends keyof T ? T[K]
    : K extends Paths<T> ? PathValue<T, K>
    : never,
>(path: K, value: V): (obj: T) => T {
  return (obj: T) => {
    return setValue(obj, path, value);
  };
}
