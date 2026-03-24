import type { UnknownObject } from "../../types/common.types.ts";

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
