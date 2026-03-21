import { setValue } from "../../setValue/setValue.ts";
import type { UnknownObject } from "../../../types/common.types.ts";
import type { PathValue } from "../../getValue/getValue.ts";
import type { Paths, UnknownArray } from "type-fest";

/**
 * Returns a function that sets the value of a property at a given key path.
 * This can set values deeply by using a dot-notation path.
 *
 * **NOTE**: the return type of this function is the same type as the input
 * object type. So you can use this function to set a value, but the type of
 * that value must still be compatible with the original type. If you wanted
 * to change the value to an incompatible type, you should use object rest
 * operators to clone the object and replace the value you need.
 *
 * @param path The key path in dot notation.
 * @param value The value to set.
 * @returns an object with the value set at the specified key path. The return
 * type will be the same as the input object type.
 */
export function setPropValue<
  T extends UnknownObject | UnknownArray,
  // We need to use this ternary expression on `K` because Paths<> returns
  // `never` on a record. E.g. Paths<string, string> = never.
  // So if `Paths<>` can't compute a set of paths, we can fall back
  // to using `keyof T` which works fine for records.
  K extends [Paths<T>] extends [never] ? keyof T : Paths<T>,
  V extends K extends keyof T ? T[K]
  : K extends Paths<T> ? PathValue<T, K>
  : never,
>(path: K, value: V): (obj: T) => T {
  return (obj: T) => {
    return setValue(obj, path, value);
  };
}
