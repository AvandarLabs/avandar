import { Paths, UnknownArray } from "type-fest";
import { Logger } from "@/lib/Logger";
import { UnknownObject } from "@/lib/types/common";
import { isArray, isPrimitive } from "../guards";
import { PathValue } from "./xgetValue";

/**
 * Sets the value of a property at a given key path in dot notation.
 *
 * We use the `x` prefix as a convention to denote a function that accepts
 * a deep key path.
 *
 * @param obj The object to set the value on.
 * @param path The key path in dot notation.
 * @param value The value to set.
 */
export function xsetValue<
  T extends UnknownObject | UnknownArray,
  P extends Paths<T>,
>(obj: T, path: P, value: PathValue<T, P>): T {
  const fullPathAsString = String(path);
  const pathParts = fullPathAsString.split(".");

  return _setValueAt(obj, pathParts, value, fullPathAsString) as T;
}

export function _setValueAt(
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
      `Key '${key}' is a primitive value '${String(value)}', but there is still more path to traverse. Remaining path: '${remainingPath}'`,
    );
  }

  // `nextObj` is a traversable object, so let's immutably update it
  if (isArray(obj)) {
    const idx = Number(key);
    const newArray = [...obj];
    newArray[idx] = _setValueAt(
      nextObj as UnknownObject | UnknownArray,
      pathTail,
      value,
      fullPath,
    );
    return newArray;
  }

  return {
    ...obj,
    [key]: _setValueAt(
      nextObj as UnknownObject | UnknownArray,
      pathTail,
      value,
      fullPath,
    ),
  };
}
