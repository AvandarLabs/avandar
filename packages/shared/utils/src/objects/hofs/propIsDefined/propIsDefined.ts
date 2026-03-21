import { hasDefinedProps } from "../../../guards/hasDefinedProps/hasDefinedProps.ts";
import type { SetDefined } from "../../../types/utilities.types.ts";
import type { SetRequired } from "type-fest";

/**
 * Returns a function that checks if an object's property at `key` is defined
 * (i.e. is not `undefined`).
 *
 * **NOTE**: we can only use top-level keys instead of dot-notation paths,
 * because we don't have a type utility to do a deep `SetDefined`.
 *
 * @param key The key of the property to check.
 * @returns A function that returns true if the property at `key` is defined.
 */
export function propIsDefined<T extends object, K extends keyof T>(
  key: K,
): (obj: T) => obj is SetRequired<T, K> & SetDefined<T, K> {
  return (obj: T) => {
    return hasDefinedProps(obj, [key]);
  };
}
