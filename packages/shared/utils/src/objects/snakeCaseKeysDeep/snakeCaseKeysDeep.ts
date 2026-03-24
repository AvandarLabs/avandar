import snakeCaseKeys from "snakecase-keys";
import type { UnknownObject } from "../../types/common.types.ts";
import type { SnakeCaseKeys } from "snakecase-keys";

/**
 * Converts an object's keys to snake_case. This is a deep conversion.
 * @param obj The object to convert.
 * @returns A new object with snake_case keys.
 */
export function snakeCaseKeysDeep<T extends UnknownObject>(
  obj: T,
): SnakeCaseKeys<T, true> {
  return snakeCaseKeys(obj, { deep: true });
}
