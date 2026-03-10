import { getValue } from "../../getValue/getValue.ts";
import type { PathValue } from "../../getValue/getValue.ts";
import type { Paths } from "type-fest";

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
  K extends [Paths<T>] extends [never] ? keyof T : Paths<T>,
  V extends K extends keyof T ? T[K]
  : K extends Paths<T> ? PathValue<T, K>
  : never,
>(path: K, value: V): (obj: T) => boolean {
  return (obj: T) => {
    if (String(path).includes(".")) {
      return getValue(obj, path) !== value;
    }
    return obj[path as keyof T] !== value;
  };
}
