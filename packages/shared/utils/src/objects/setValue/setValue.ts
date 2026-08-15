import { isArray } from "@utils/guards/isArray/isArray.ts";
import { isPrimitive } from "@utils/guards/isPrimitive/isPrimitive.ts";
import type { PathValue } from "@utils/objects/getValue/getValue.ts";
import type { ObjectPaths } from "@utils/objects/ObjectPaths/ObjectPaths.types.ts";
import type { UnknownObject } from "@utils/types/common.types.ts";
import type { UnknownArray } from "type-fest";

/**
 * Sets the value of a property at a given key path.
 * This can set values deeply by using a dot-notation path.
 *
 * @param obj The object to set the value on.
 * @param path The key path in dot notation.
 * @param value The value to set.
 */
export function setValue<
  T extends UnknownObject | UnknownArray,
  // We need to use this ternary expression on `K` because ObjectPaths<> returns
  // `never` on a record. E.g. ObjectPaths<string, string> = never.
  // So if `ObjectPaths<>` can't compute a set of paths, we can fall back
  // to using `keyof T` which works fine for records.
  K extends [ObjectPaths<T>] extends [never] ? keyof T : ObjectPaths<T>,
  V extends K extends keyof T ? T[K]
  : K extends ObjectPaths<T> ? PathValue<T, K>
  : never,
>(obj: T, path: K, value: V): T {
  const fullPathAsString = String(path);
  const pathParts = fullPathAsString.split(".");
  return _setValue(obj, pathParts, value, fullPathAsString) as T;
}

export function _setValue(
  obj: UnknownObject | UnknownArray,
  paths: readonly string[],
  value: unknown,
  fullPath: string,
): unknown {
  const [key, ...pathTail] = paths;

  // First, some error handling. If the `key` is undefined then let's error
  // out early.
  if (key === undefined) {
    throw new Error(
      `Undefined is not a valid key to set. Full path: '${fullPath}'`,
    );
  }

  // Base case: we ran out of path. Set the value at our final key.
  if (pathTail.length === 0) {
    if (isArray(obj)) {
      const idx = Number(key);
      const newArray = [...obj];
      newArray[idx] = value;
      return newArray;
    }
    return { ...obj, [key]: value };
  }

  // Otherwise, keep traversing and immutably changing things as we go.
  const nextObjRaw = isArray(obj) ? obj[Number(key)] : obj[key];
  // Create a missing intermediate object so deep sets work on sparse objects
  // (e.g. setting `chartStyle.xAxis.labelColor` when `chartStyle` is unset).
  const nextObj = nextObjRaw === undefined ? {} : nextObjRaw;

  // If our next object is a (non-undefined) primitive, i.e. non-traversable,
  // then we raise an error.
  if (isPrimitive(nextObj)) {
    const remainingPath = pathTail.join(".");
    throw new Error(
      `Key '${key}' is a primitive value '${String(
        value,
      )}', but there is still more path to traverse. Remaining path: '${remainingPath}'`,
    );
  }

  // `nextObj` is a traversable object, so let's immutably update it
  if (isArray(obj)) {
    const idx = Number(key);
    const newArray = [...obj];
    newArray[idx] = _setValue(
      nextObj as UnknownObject | UnknownArray,
      pathTail,
      value,
      fullPath,
    );
    return newArray;
  }

  return {
    ...obj,
    [key]: _setValue(
      nextObj as UnknownObject | UnknownArray,
      pathTail,
      value,
      fullPath,
    ),
  };
}
