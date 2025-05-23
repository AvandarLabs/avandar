import { Paths, UnknownArray } from "type-fest";
import { object } from "zod";
import { Logger } from "@/lib/Logger";
import { UnknownObject } from "@/lib/types/common";
import { isArray, isPrimitive } from "../guards";

/**
 * Gets the type of a value from an object given a key path in
 * dot notation.
 */
export type PathValue<T, P extends Paths<T>> =
  P extends `${infer K}.${infer Rest}` ?
    K extends keyof T ?
      Rest extends Paths<T[K]> ?
        PathValue<T[K], Rest>
      : never
    : K extends `${number}` ?
      T extends UnknownArray ?
        Rest extends Paths<T[number]> ?
          PathValue<T[number], Rest>
        : never
      : never
    : never
  : // evaluate the final key. Check if this is an array access.
  P extends `${number}` ?
    T extends UnknownArray ?
      T[number]
    : never
  : // else, check if this is a valid key in T we can access
  P extends keyof T ? T[P]
  : never;

/**
 * Gets the value of a property at a given key path.
 * This can get values deeply by using a dot-notation path.
 *
 * @param obj The object to get the value from.
 * @param path The key path in dot notation.
 * @returns The value of the property.
 */
export function getValue<
  T extends UnknownObject | UnknownArray,
  K extends [Paths<T>] extends [never] ? keyof T : Paths<T>,
  V extends K extends keyof T ? T[K]
  : K extends Paths<T> ? PathValue<T, K>
  : never,
>(obj: T, path: K): V {
  const fullPathAsString = String(path);
  const pathParts = fullPathAsString.split(".");
  return _getValue(obj, pathParts, fullPathAsString) as V;
}

export function _getValue(
  obj: UnknownObject | UnknownArray,
  paths: readonly string[],
  fullPath: string,
): unknown {
  const [key, ...pathTail] = paths;

  // Error handling:
  // Get the value at this key. Make sure this key exists in the object
  // or array first.
  let value: unknown;
  if (isArray(obj)) {
    if (!key || !(Number(key) in obj)) {
      Logger.error(`Key '${key}' not found in array`, {
        array: obj,
        fullPath,
      });
      throw new Error(
        `Key '${key}' not found in array. Full path: '${fullPath}'`,
      );
    }
    value = obj[Number(key)];
  } else {
    if (!key || !(key in obj)) {
      Logger.error(`Key '${key}' not found in object`, {
        object,
        fullPath,
      });
      throw new Error(
        `Key '${key}' not found in object. Full path: '${fullPath}'`,
      );
    }
    value = obj[key];
  }

  // We ran out of path, so this is the value to return
  if (pathTail.length === 0) {
    return value;
  }

  // From this point on, we know there is still a `pathTail` to traverse.
  // If we are at a primitive value, then that's bad.
  if (isPrimitive(value)) {
    const remainingPath = pathTail.join(".");
    throw new Error(
      `Key '${key}' is a primitive value '${String(value)}', but there is still more path to traverse. Remaining path: '${remainingPath}'`,
    );
  }

  // At this point, `value` is either an object or an array
  // and we still have a `pathTail` so we keep traversing
  return _getValue(value as UnknownObject | UnknownArray, pathTail, fullPath);
}
