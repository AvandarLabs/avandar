import { Logger } from "$/lib/Logger/Logger";
import { UnknownObject } from "$/lib/types/common";
import { isArray } from "$/lib/utils/guards/isArray/isArray";
import { Paths, UnknownArray } from "type-fest";
import { isPrimitive } from "../guards/guards";
import { PathValue } from "./getValue";

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
  // We need to use this ternary expression on `K` because Paths<> returns
  // `never` on a record. E.g. Paths<string, string> = never.
  // So if `Paths<>` can't compute a set of paths, we can fall back
  // to using `keyof T` which works fine for records.
  K extends [Paths<T>] extends [never] ? keyof T : Paths<T>,
  V extends K extends keyof T ? T[K]
  : K extends Paths<T> ? PathValue<T, K>
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
    Logger.error(`Undefined is not a valid key to set`, {
      fullPath,
    });
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
  const nextObj = isArray(obj) ? obj[Number(key)] : obj[key];

  // If our next object is a primitive (i.e. non-traversable) then we raise an
  // error
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
