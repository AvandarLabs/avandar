import { getValue } from "@utils/objects/getValue/getValue.ts";
import type { PathValue } from "@utils/objects/getValue/getValue.ts";
import type { ObjectPaths } from "@utils/objects/ObjectPaths/ObjectPaths.types.ts";

/**
 * Returns a function that checks if an object's property at `path` **doesn't**
 * equal `value`.
 *
 * @param path The path of the property to check.
 * @param value The value to check.
 * @returns A function that returns true if the property at `path` is **not**
 * equal to `value`
 */
export function propNotEq<
  T extends object,
  K extends [ObjectPaths<T>] extends [never] ? keyof T : ObjectPaths<T>,
  V extends K extends keyof T ? T[K]
  : K extends ObjectPaths<T> ? PathValue<T, K>
  : never,
>(path: K, value: V): (obj: T) => boolean {
  return (obj: T) => {
    if (String(path).includes(".")) {
      return getValue(obj, path) !== value;
    }
    return obj[path as keyof T] !== value;
  };
}
