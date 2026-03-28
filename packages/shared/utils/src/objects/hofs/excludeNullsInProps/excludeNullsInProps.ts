import { excludeNullsIn } from "@utils/objects/excludeNullsIn/excludeNullsIn.ts";
import type { UnknownObject } from "@utils/types/common.types.ts";
import type { ExcludeNullsIn } from "@utils/objects/excludeNullsIn/excludeNullsIn.ts";

/**
 * Returns a function that excludes nulls from the specified keys.
 * If no keys are specified, we assume `keysToTest` is the entire
 * object, so we will exclude nulls from all keys.
 *
 * This is a shallow operation.
 *
 * @param obj The object to exclude nulls from.
 * @param keysToTest The keys to test for null values.
 * @returns A new object with nulls excluded from the specified keys.
 */
export function excludeNullsInProps<T extends UnknownObject, K extends keyof T>(
  keysToTest: Extract<K, string> | readonly K[],
): (obj: T) => ExcludeNullsIn<T, K> {
  return (obj: T) => {
    return excludeNullsIn(obj, keysToTest);
  };
}
