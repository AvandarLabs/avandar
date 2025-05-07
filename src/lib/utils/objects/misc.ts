import { StringKeyOf } from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { Entries } from "@/lib/types/utilityTypes";

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
  ...keysToRemove: readonly K[]
): Omit<T, K> {
  const newObj = { ...fromObj };
  keysToRemove.forEach((key) => {
    delete newObj[key];
  });
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
  ...keysToPick: readonly K[]
): Pick<T, K> {
  const newObj = {} as Pick<T, K>;
  keysToPick.forEach((key) => {
    newObj[key] = fromObj[key];
  });
  return newObj;
}
