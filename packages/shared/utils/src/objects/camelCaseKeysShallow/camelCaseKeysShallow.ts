import camelCaseKeys from "camelcase-keys";
import type { UnknownObject } from "../../types/common.types.ts";
import type { CamelCaseKeys } from "camelcase-keys";

/**
 * Converts an object's keys to camelCase. This is a shallow conversion.
 * @param obj The object to convert.
 * @returns A new object with camelCase keys at the first level.
 */
export function camelCaseKeysShallow<T extends UnknownObject>(
  obj: T,
): CamelCaseKeys<T, false> {
  return camelCaseKeys(obj, { deep: false });
}
