import { omit } from "../../omit/omit.ts";
import type { UnknownObject } from "../../../types/common.types.ts";

/**
 * Returns a function that removes the specified keys from an object.
 * @param keys The keys to remove from the object.
 * @returns A function that removes the specified keys from an object.
 */
export function omitProps<T extends UnknownObject, K extends keyof T>(
  keys: Extract<K, string> | readonly K[],
): (obj: T) => Omit<T, K> {
  return (obj: T) => {
    return omit(obj, keys);
  };
}
