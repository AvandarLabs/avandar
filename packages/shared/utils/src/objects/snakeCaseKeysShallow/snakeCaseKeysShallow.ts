import snakeCaseKeys from "snakecase-keys";
import type { UnknownObject } from "@utils/types/common.types.ts";
import type { SnakeCaseKeys } from "snakecase-keys";

/**
 * Converts an object's keys to snake_case. This is a shallow conversion.
 * @param obj The object to convert.
 * @returns A new object with snake_case keys at the first level.
 */
export function snakeCaseKeysShallow<T extends UnknownObject>(
  obj: T,
): SnakeCaseKeys<T, false> {
  return snakeCaseKeys(obj, { deep: false });
}
