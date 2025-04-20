import camelcaseKeys, { CamelCaseKeys } from "camelcase-keys";
import snakecaseKeys, { SnakeCaseKeys } from "snakecase-keys";
import { UnknownObject } from "@/lib/types/common";
import { ExcludeDeep, ObjectStringKey } from "@/lib/types/utilityTypes";
import { identity } from "@/lib/utils/functions";
import { isPlainObject, isUndefined } from "./guards";

/**
 * Returns an array of entries from an object.
 * @param obj The object to get the entries from.
 * @returns An array of entries from the object.
 */
export function objectEntries<T extends UnknownObject>(
  obj: T,
): Array<[ObjectStringKey<T>, T[ObjectStringKey<T>]]> {
  return Object.entries(obj) as Array<
    [ObjectStringKey<T>, T[ObjectStringKey<T>]]
  >;
}

/**
 * Returns an array of keys from an object.
 * @param obj The object to get the keys from.
 * @returns An array of keys from the object.
 */
export function objectKeys<T extends UnknownObject>(
  obj: T,
): Array<ObjectStringKey<T>> {
  return Object.keys(obj) as Array<ObjectStringKey<T>>;
}

/**
 * Creates an object from a list of items, given a function to extract the key
 * and a function to extract the value.
 *
 * @param options The options for creating the object.
 * @param options.inputList The list of items to convert.
 * @param options.keyFn A function that returns the key for each item.
 * @param options.valueFn A function that returns the value for each
 * item. Defaults to the identity function.
 *
 * @returns An object with keys and values extracted from the list.
 */
export function makeObjectFromList<
  T,
  K extends string | number = string,
  V = T,
>({
  inputList,
  keyFn,
  valueFn = identity as (item: T) => V,
}: {
  inputList: readonly T[];
  keyFn: (item: T) => K;
  valueFn?: (item: T) => V;
}): Record<K, V> {
  const obj = {} as Record<K, V>;
  inputList.forEach((item) => {
    obj[keyFn(item)] = valueFn(item);
  });
  return obj;
}

/**
 * Creates an object from a list of keys, given a function to generate the
 * value.
 *
 * @param options The options for creating the object.
 * @param options.keys The list of keys to convert.
 * @param options.valueFn A function that returns the value for each key.
 * @param options.defaultValue The value to give each key.
 *
 * @returns An object with keys and values produced from the given options.
 */
export function makeObjectFromKeys<K extends string | number, V = unknown>(
  options:
    | {
        keys: readonly K[];
        valueFn: (key: K) => V;
      }
    | {
        keys: readonly K[];
        defaultValue: V;
      },
): Record<K, V> {
  const obj = {} as Record<K, V>;
  options.keys.forEach((key) => {
    if ("valueFn" in options) {
      obj[key] = options.valueFn(key);
    } else {
      obj[key] = options.defaultValue;
    }
  });
  return obj;
}

/**
 * Creates an object from a list of [key, value] tuples.
 * @param entries The list of [key, value] tuples to convert.
 * @returns An object with keys and values extracted from the entries.
 */
export function makeObjectFromEntries<K extends string | number, V>(
  entries: ReadonlyArray<[K, V]>,
): Record<K, V> {
  return Object.fromEntries(entries) as Record<K, V>;
}

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
 * Returns a function that checks if an object has a property with a specific
 * value.
 * @param key The key of the property to check.
 * @param value The value to check.
 * @returns A function that returns true if the object has the property with
 * the specified value.
 */
export function propEquals<T extends object, K extends keyof T>(
  key: K,
  value: T[K],
): (obj: T) => boolean {
  return (obj: T) => {
    return obj[key] === value;
  };
}

/**
 * Returns a new object with the specified keys removed.
 *
 * @param options The options for omitting keys.
 * @param options.inputObj The object to remove keys from.
 * @param options.keysToDelete The keys to remove from the object.
 * @returns A new object with the specified keys removed.
 */
export function omit<T extends UnknownObject, K extends keyof T>({
  inputObj,
  keysToDelete,
}: {
  inputObj: T;
  keysToDelete: readonly K[];
}): Omit<T, K> {
  const newObj = { ...inputObj };
  keysToDelete.forEach((key) => {
    delete newObj[key];
  });
  return newObj;
}

/**
 * Converts an object's keys to camelCase. This is a deep conversion.
 * @param obj The object to convert.
 * @returns A new object with camelCase keys.
 */
export function camelCaseKeysDeep<T extends UnknownObject>(
  obj: T,
): CamelCaseKeys<T, true> {
  return camelcaseKeys(obj, { deep: true });
}

/**
 * Converts an object's keys to camelCase. This is a shallow conversion.
 * @param obj The object to convert.
 * @returns A new object with camelCase keys at the first level.
 */
export function camelCaseKeysShallow<T extends UnknownObject>(
  obj: T,
): CamelCaseKeys<T, false> {
  return camelcaseKeys(obj, { deep: false });
}

/**
 * Converts an object's keys to snake_case. This is a deep conversion.
 * @param obj The object to convert.
 * @returns A new object with snake_case keys.
 */
export function snakeCaseKeysDeep<T extends UnknownObject>(
  obj: T,
): SnakeCaseKeys<T, true> {
  return snakecaseKeys(obj, { deep: true });
}

/**
 * Converts an object's keys to snake_case. This is a shallow conversion.
 * @param obj The object to convert.
 * @returns A new object with snake_case keys at the first level.
 */
export function snakeCaseKeysShallow<T extends UnknownObject>(
  obj: T,
): SnakeCaseKeys<T, false> {
  return snakecaseKeys(obj, { deep: false });
}

export function deepExclude<T, TypeToExclude>(
  obj: T,
  exclude: (value: unknown) => value is TypeToExclude,
): ExcludeDeep<T, TypeToExclude> {
  // Return any values (other than objects) as is
  if (typeof obj !== "object" || obj === null) {
    return obj as ExcludeDeep<T, TypeToExclude>;
  }

  // Now, handle different types of objects in special ways
  if (Array.isArray(obj)) {
    return obj
      .filter((v) => {
        return !exclude(v);
      })
      .map((item) => {
        return deepExclude(item, exclude);
      }) as ExcludeDeep<T, TypeToExclude>;
  }

  if (obj instanceof Map) {
    const newEntries = [...obj.entries()]
      .filter(([_, value]) => {
        return !exclude(value);
      })
      .map(([key, value]) => {
        return [key, deepExclude(value, exclude)];
      }) as ReadonlyArray<[unknown, unknown]>;
    return new Map(newEntries) as ExcludeDeep<T, TypeToExclude>;
  }

  if (obj instanceof Set) {
    const newValues = [...obj.values()]
      .filter((v) => {
        return !exclude(v);
      })
      .map((value) => {
        return deepExclude(value, exclude);
      }) as readonly unknown[];
    return new Set(newValues) as ExcludeDeep<T, TypeToExclude>;
  }

  if (isPlainObject(obj)) {
    const newObj: UnknownObject = {};
    Object.keys(obj).forEach((key) => {
      const val = obj[key];
      if (!exclude(val)) {
        newObj[key] = deepExclude(val, exclude);
      }
    });
    return newObj as ExcludeDeep<T, TypeToExclude>;
  }

  // any other objects, e.g. class instances, will not be traversed
  // and we return them as is
  return obj as ExcludeDeep<T, TypeToExclude>;
}

/**
 * Drop all keys that have an `undefined` value. This is a deep transformation.
 * For Maps, the keys (which technically can be of any type) will not get
 * transformed. We only apply this function on the values.
 *
 * @param obj The object to drop all `undefined` values.
 * @returns A new object with all `undefined` values dropped.
 */
export function dropUndefinedDeep<T extends Exclude<unknown, undefined>>(
  obj: T,
): ExcludeDeep<T, undefined> {
  return deepExclude(obj, isUndefined);
}
