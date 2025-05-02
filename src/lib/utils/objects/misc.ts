import camelcaseKeys, { CamelCaseKeys } from "camelcase-keys";
import snakecaseKeys, { SnakeCaseKeys } from "snakecase-keys";
import { StringKeyOf } from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { Entries, ExcludeDeep } from "@/lib/types/utilityTypes";
import { isPlainObject, isUndefined } from "../guards";

/**
 * Returns an array of entries from an object.
 * @param obj The object to get the entries from.
 * @returns An array of entries from the object.
 */
export function objectEntries<T extends UnknownObject>(obj: T): Entries<T> {
  return Object.entries(obj) as Entries<T>;
}

/**
 * Returns an array of keys from an object.
 * @param obj The object to get the keys from.
 * @returns An array of keys from the object.
 */
export function objectKeys<T extends UnknownObject>(
  obj: T,
): Array<StringKeyOf<T>> {
  return Object.keys(obj) as Array<StringKeyOf<T>>;
}

/**
 * Returns an array of values from an object.
 * @param obj The object to get values from.
 * @returns An array of values from the object
 */
export function objectValues<T extends UnknownObject>(
  obj: T,
): Array<T[keyof T]> {
  return Object.values(obj) as Array<T[keyof T]>;
}

/**
 * Returns a new object with the specified keys removed.
 *
 * @param options The options for omitting keys.
 * @param options.from The object to remove keys from.
 * @param options.keysToDelete The keys to remove from the object.
 * @returns A new object with the specified keys removed.
 */
export function omit<T extends UnknownObject, K extends keyof T>({
  from,
  keysToDelete,
}: {
  from: T;
  keysToDelete: readonly K[];
}): Omit<T, K> {
  const newObj = { ...from };
  keysToDelete.forEach((key) => {
    delete newObj[key];
  });
  return newObj;
}

/**
 * Returns a new object with the specified keys.
 *
 * @param options The options for picking keys.
 * @param options.from The object to pick keys from.
 * @param options.keysToPick The keys to pick from the object.
 * @returns A new object with the specified keys.
 */
export function pick<T extends UnknownObject, K extends keyof T>({
  from,
  keysToPick,
}: {
  from: T;
  keysToPick: readonly K[];
}): Pick<T, K> {
  const newObj = {} as Pick<T, K>;
  keysToPick.forEach((key) => {
    newObj[key] = from[key];
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
