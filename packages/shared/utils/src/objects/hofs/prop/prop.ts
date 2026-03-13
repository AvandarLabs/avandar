import { getValue } from "../../getValue/getValue.ts";
import type { PathValue } from "../../getValue/getValue.ts";
import type { Paths } from "type-fest";

/**
 * Returns a getter function that returns the value of a property at a given
 * key path in dot notation.
 *
 * @param path The path of the property to get.
 * @returns A function that returns the value at the given key path.
 */
export function prop<
  T extends object,
  K extends [Paths<T>] extends [never] ? keyof T : Paths<T>,
  V extends K extends keyof T ? T[K]
  : K extends Paths<T> ? PathValue<T, K>
  : never,
>(path: K): (obj: T) => V {
  return (obj: T) => {
    if (String(path).includes(".")) {
      return getValue(obj, path);
    }
    return obj[path as keyof T] as V;
  };
}
