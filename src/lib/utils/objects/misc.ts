import { UnknownObject } from "@/lib/types/common";
import { Entries, Registry, StringKeyOf } from "@/lib/types/utilityTypes";

/**
 * Returns an array of entries from an object.
 * @param obj The object to get the entries from.
 * @returns An array of entries from the object.
 */
export function objectEntries<T extends UnknownObject>(obj: T): Entries<T> {
  return Object.entries(obj) as Entries<T>;
}

/**
 * Returns an array of keys from an object.
 * @param obj The object to get the keys from.
 * @returns An array of keys from the object.
 */
export function objectKeys<T extends UnknownObject>(
  obj: T,
): Array<StringKeyOf<T>> {
  return Object.keys(obj) as Array<StringKeyOf<T>>;
}

/**
 * Returns an array of values from an object.
 * @param obj The object to get values from.
 * @returns An array of values from the object
 */
export function objectValues<T extends UnknownObject>(
  obj: T,
): Array<T[keyof T]> {
  return Object.values(obj) as Array<T[keyof T]>;
}

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

/**
 * Helper function to generate a type-safe registry.
 * This is useful to generate type-safe and **exhaustive** arrays of a string
 * literal union.
 *
 * It requires that the `LiteralUnion` type always be passed in explicitly
 * as a generic type parameter.
 *
 * @example
 * type Letter = "a" | "b" | "c";
 * const letters = registry<Letter>().keys("a", "b", "c"); // ["a", "b", "c"]
 *
 * @returns A function to build an array of keys, type-checked against a literal
 * union.
 */
export function registry<
  LiteralUnion extends string,
  FullRegistry extends Registry<LiteralUnion> = Registry<LiteralUnion>,
>(): {
  keys: <
    T extends [LiteralUnion, ...LiteralUnion[]],
    MissingKeys extends keyof FullRegistry extends T[number] ? T[number]
    : Exclude<keyof FullRegistry, T[number]>,
  >(
    ...keys: T & MissingKeys[]
  ) => T;
} {
  return {
    keys: (...keys) => {
      return keys;
    },
  };
}
