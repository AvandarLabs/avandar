import { UnknownObject } from "@/types/common";
import { ObjectStringKey } from "@/types/utilityTypes";
import { identity } from "@/utils/functions";

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
 * @param options.valueFn A function that returns the value for each item.
 * Defaults to the identity function.
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
export function getProp<T extends UnknownObject, K extends ObjectStringKey<T>>(
  key: K,
): (obj: T) => T[K] {
  return (obj: T) => {
    return obj[key];
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
