import type { SetDefined } from "@utils/types/utilities.types.ts";
import type { SetRequired } from "type-fest";

/**
 * Checks if `obj` has all the properties in `properties` and that they are
 * not undefined.
 *
 * NOTE: this guard only works properly for strictly defined objects and keys
 * as literals. For objects with indexers or keys as broad strings, you should
 * do a manual check instead of using this guard.
 *
 * NOTE: this still allows `null` values. This literally just checks that it's
 * not `undefined`.
 *
 * @param obj - The object to check.
 * @param properties - The properties to check.
 * @returns `true` if `obj` has all the properties in `properties` and that
 * they are not undefined, `false` otherwise.
 */
export function hasDefinedProps<T extends object, Key extends keyof T>(
  obj: T,
  properties: Extract<Key, string> | readonly Key[],
): obj is SetRequired<T, Key> & SetDefined<T, Key> {
  const props = typeof properties === "string" ? [properties] : properties;
  return props.every((prop) => {
    return prop in obj && obj[prop] !== undefined;
  });
}
