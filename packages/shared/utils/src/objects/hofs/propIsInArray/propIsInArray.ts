import { getValue } from "@utils/objects/getValue/getValue.ts";
import type { PathValue } from "@utils/objects/getValue/getValue.ts";
import type { Paths } from "type-fest";

/**
 * Returns a function that checks if an object's property
 * at `path` is included in `array`.
 *
 * @param path The path of the property to check.
 * @param array The array of allowed values.
 * @returns A function that returns true if the value at
 * `path` is in `array`.
 */
export function propIsInArray<
  T extends object,
  K extends [Paths<T>] extends [never] ? keyof T : Paths<T>,
  V extends K extends keyof T ? T[K]
  : K extends Paths<T> ? PathValue<T, K>
  : never,
>(path: K, array: readonly V[]): (obj: T) => boolean {
  return (obj: T) => {
    return array.includes(getValue(obj, path));
  };
}
