import type { UnknownObject } from "../types/common.types.ts";
import type { Entries } from "../types/utilities.types.ts";

/**
 * Returns an array of entries from an object.
 * @param obj The object to get the entries from.
 * @returns An array of entries from the object.
 */
export function objectEntries<T extends UnknownObject>(obj: T): Entries<T> {
  return Object.entries(obj) as Entries<T>;
}
