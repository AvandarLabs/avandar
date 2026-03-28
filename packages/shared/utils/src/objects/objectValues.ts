import type { UnknownObject } from "@utils/types/common.types.ts";

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
