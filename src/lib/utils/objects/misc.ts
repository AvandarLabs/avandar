import { UnknownObject } from "@/lib/types/common";
import { Entries, Registry, StringKeyOf } from "@/lib/types/utilityTypes";

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
 * @param fromObj The object to remove keys from.
 * @param keysToRemove The keys to remove from the object.
 * @returns A new object with the specified keys removed.
 */
export function omit<T extends UnknownObject, K extends keyof T>(
  fromObj: T,
  keysToRemove: Extract<K, string> | readonly K[],
): Omit<T, K> {
  const newObj = { ...fromObj };
  if (typeof keysToRemove === "string") {
    delete newObj[keysToRemove];
    return newObj;
  } else {
    keysToRemove.forEach((key) => {
      delete newObj[key];
    });
  }
  return newObj;
}

/**
 * Returns a new object with the specified keys.
 *
 * @param fromObj The object to pick keys from.
 * @param keysToPick The keys to pick from the object.
 * @returns A new object with the specified keys.
 */
export function pick<T extends UnknownObject, K extends keyof T>(
  fromObj: T,
  keysToPick: Extract<K, string> | readonly K[],
): Pick<T, K> {
  const newObj = {} as Pick<T, K>;
  if (typeof keysToPick === "string") {
    newObj[keysToPick] = fromObj[keysToPick];
  } else {
    keysToPick.forEach((key) => {
      newObj[key] = fromObj[key];
    });
  }
  return newObj;
}

/**
 * Helper function to get the keys of a registry. This is useful to generate
 * type-safe arrays of a string literal union
 * @param registry The registry to get the keys from.
 * @returns The keys from the registry.
 */
export function registryKeys<LiteralUnion extends string>(
  registry: Registry<LiteralUnion>,
): LiteralUnion[] {
  return objectKeys(registry) as unknown as LiteralUnion[];
}
