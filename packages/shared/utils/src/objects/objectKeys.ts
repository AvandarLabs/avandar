import type { UnknownObject } from "../types/common.ts";
import type { StringKeyOf } from "../types/utilityTypes.ts";

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
