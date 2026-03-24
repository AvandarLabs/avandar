import { isUndefined } from "../../guards/isUndefined/isUndefined.ts";
import { objectKeys } from "../objectKeys.ts";
import type { UnknownObject } from "../../types/common.types.ts";

/** The result type of `excludeUndefinedShallow`. */
export type ExcludeUndefinedShallow<T extends UnknownObject> = {
  [K in keyof T]: undefined extends T[K] ? Exclude<T[K], undefined> : T[K];
};

/**
 * Excludes all `undefined` values from an object shallowly.
 *
 * @param obj The object to exclude undefineds from.
 * @returns The object with all undefineds excluded.
 */
export function excludeUndefinedShallow<T extends UnknownObject>(
  obj: T,
): ExcludeUndefinedShallow<T> {
  const newObj: UnknownObject = {};
  objectKeys(obj).forEach((key) => {
    if (!isUndefined(obj[key])) {
      newObj[key] = obj[key];
    }
  });
  return newObj as ExcludeUndefinedShallow<T>;
}
