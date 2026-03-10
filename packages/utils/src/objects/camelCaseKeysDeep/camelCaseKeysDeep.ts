import camelCaseKeys from "camelcase-keys";
import type { UnknownObject } from "../../types/common.ts";
import type { CamelCaseKeys } from "camelcase-keys";

/**
 * Converts an object's keys to camelCase. This is a deep conversion.
 * @param obj The object to convert.
 * @returns A new object with camelCase keys.
 */
export function camelCaseKeysDeep<T extends UnknownObject>(
  obj: T,
): CamelCaseKeys<T, true> {
  return camelCaseKeys(obj, { deep: true });
}
