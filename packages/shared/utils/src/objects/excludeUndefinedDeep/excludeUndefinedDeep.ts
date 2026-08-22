import { isUndefined } from "@utils/guards/isUndefined/isUndefined.ts";
import { excludeDeep } from "@utils/objects/excludeDeep/excludeDeep.ts";
import type { ExcludeDeep } from "@utils/types/utilities.types.ts";

/**
 * Drop all keys that have an `undefined` value. This is a deep transformation.
 * For Maps, the keys (which technically can be of any type) will not get
 * transformed. We only apply this function on the values.
 *
 * @param obj The object to drop all `undefined` values.
 * @returns A new object with all `undefined` values dropped.
 */
export function excludeUndefinedDeep<T extends Exclude<unknown, undefined>>(
  obj: T,
): ExcludeDeep<T, undefined> {
  return excludeDeep(obj, isUndefined);
}
