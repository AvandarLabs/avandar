import { setValue } from "@utils/objects/setValue/setValue.ts";
import type { PathValue } from "@utils/objects/getValue/getValue.ts";
import type { ObjectPaths } from "@utils/objects/ObjectPaths/ObjectPaths.types.ts";
import type { UnknownObject } from "@utils/types/common.types.ts";
import type { UnknownArray } from "type-fest";

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
  // We need to use this ternary expression on `K` because ObjectPaths<> returns
  // `never` on a record. E.g. ObjectPaths<string, string> = never.
  // So if `ObjectPaths<>` can't compute a set of paths, we can fall back
  // to using `keyof T` which works fine for records.
  K extends [ObjectPaths<T>] extends [never] ? keyof T : ObjectPaths<T>,
  V extends K extends keyof T ? T[K]
  : K extends ObjectPaths<T> ? PathValue<T, K>
  : never,
>(path: K, value: V): (obj: T) => T {
  return (obj: T) => {
    return setValue(obj, path, value);
  };
}
