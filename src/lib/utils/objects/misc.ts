import { UnknownObject } from "$/lib/types/common";
import { Registry } from "$/lib/types/utilityTypes";
import { objectKeys } from "$/lib/utils/objects/objectKeys";

/**
 * Returns a new object with the specified keys removed.
 *
 * @param fromObj The object to remove keys from.
 * @param keysToRemove The keys to remove from the object.
 * @returns A new object with the specified keys removed.
 */
export function omit<T extends UnknownObject, K extends keyof T>(
  fromObj: T,
  keysToRemove: Extract<K, string> | readonly K[],
): Omit<T, K> {
  const newObj = { ...fromObj };
  if (typeof keysToRemove === "string") {
    delete newObj[keysToRemove];
    return newObj;
  } else {
    keysToRemove.forEach((key) => {
      delete newObj[key];
    });
  }
  return newObj;
}

/**
 * Returns a new object with the specified keys.
 *
 * @param fromObj The object to pick keys from.
 * @param keysToPick The keys to pick from the object.
 * @returns A new object with the specified keys.
 */
export function pick<T extends UnknownObject, K extends keyof T>(
  fromObj: T,
  keysToPick: Extract<K, string> | readonly K[],
): Pick<T, K> {
  const newObj = {} as Pick<T, K>;
  if (typeof keysToPick === "string") {
    newObj[keysToPick] = fromObj[keysToPick];
  } else {
    keysToPick.forEach((key) => {
      newObj[key] = fromObj[key];
    });
  }
  return newObj;
}

/**
 * Helper function to get the keys of a registry. This is useful to generate
 * type-safe arrays of a string literal union
 * @param registryObj The registry to get the keys from.
 * @returns The keys from the registry.
 *
 * @deprecated Use `registry<LiteralUnion>().keys()` instead.
 */
export function registryKeys<LiteralUnion extends string>(
  registryObj: Registry<LiteralUnion>,
): LiteralUnion[] {
  return objectKeys(registryObj) as unknown as LiteralUnion[];
}
