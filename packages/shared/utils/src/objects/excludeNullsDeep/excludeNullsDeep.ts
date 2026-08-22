import { isNull } from "@utils/guards/isNull/isNull.ts";
import { excludeDeep } from "@utils/objects/excludeDeep/excludeDeep.ts";
import type { ExcludeDeep } from "@utils/types/utilities.types.ts";

/**
 * Drop all keys that have a `null` value. This is a deep transformation.
 * For Maps, the keys (which technically can be of any type) will not get
 * transformed. We only apply this function on the values.
 *
 * @param obj The object to drop all `null` values.
 * @returns A new object with all `null` values dropped.
 */
export function excludeNullsDeep<T extends Exclude<unknown, null>>(
  obj: T,
): ExcludeDeep<T, null> {
  return excludeDeep(obj, isNull);
}
