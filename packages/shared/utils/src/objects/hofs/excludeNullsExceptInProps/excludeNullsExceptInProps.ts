import { excludeNullsExceptIn } from "@utils/objects/excludeNullsExceptIn/excludeNullsExceptIn.ts";
import type { UnknownObject } from "@utils/types/common.types.ts";
import type { StringKeyOf } from "@utils/types/utilities.types.ts";
import type { ExcludeNullsExceptIn } from "@utils/objects/excludeNullsExceptIn/excludeNullsExceptIn.ts";

/**
 * Returns a function that excludes nulls from all keys except the specified
 * keys. Those keys will continue to allow `null` values. This is a shallow
 * operation.
 *
 * If no keys are specified, we assume `keysToKeepNull` is the entire
 * object. Therefore, the object is left unchanged.
 *
 * At the type level, any keys that can possibly be `null` will now have a
 * union with `undefined`.
 *
 * @param keys The keys to exclude nulls from.
 * @returns A function that excludes nulls from the specified keys.
 */
export function excludeNullsExceptInProps<
  T extends UnknownObject,
  K extends StringKeyOf<T>,
>(keysToKeepNull: K | readonly K[]): (obj: T) => ExcludeNullsExceptIn<T, K> {
  return (obj: T) => {
    return excludeNullsExceptIn(obj, keysToKeepNull);
  };
}
