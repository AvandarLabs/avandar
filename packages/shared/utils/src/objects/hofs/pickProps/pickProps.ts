import { pick } from "../../pick/pick.ts";
import type { UnknownObject } from "../../../types/common.types.ts";

/**
 * Returns a function that picks the specified keys from an object.
 * @param keys The keys to pick from the object.
 * @returns A function that picks the specified keys from an object.
 */
export function pickProps<T extends UnknownObject, K extends keyof T>(
  keys: Extract<K, string> | readonly K[],
): (obj: T) => Pick<T, K> {
  return (obj: T) => {
    return pick(obj, keys);
  };
}
