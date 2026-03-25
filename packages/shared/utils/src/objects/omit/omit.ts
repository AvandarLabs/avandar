import type { UnknownObject } from "@utils/types/common.types.ts";

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
