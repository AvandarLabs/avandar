import camelcaseKeys, { CamelCaseKeys } from "camelcase-keys";
import snakecaseKeys, { SnakeCaseKeys } from "snakecase-keys";
import { UnknownObject } from "@/lib/types/common";
import { ExcludeDeep, SwapDeep } from "@/lib/types/utilityTypes";
import { isNull, isPlainObject, isUndefined } from "../guards";
import { constant } from "../higherOrderFuncs";
import { objectKeys } from "./misc";

/**
 * Converts an object's keys to camelCase. This is a deep conversion.
 * @param obj The object to convert.
 * @returns A new object with camelCase keys.
 */
export function camelCaseKeysDeep<T extends UnknownObject>(
  obj: T,
): CamelCaseKeys<T, true> {
  return camelcaseKeys(obj, { deep: true });
}

/**
 * Converts an object's keys to camelCase. This is a shallow conversion.
 * @param obj The object to convert.
 * @returns A new object with camelCase keys at the first level.
 */
export function camelCaseKeysShallow<T extends UnknownObject>(
  obj: T,
): CamelCaseKeys<T, false> {
  return camelcaseKeys(obj, { deep: false });
}

/**
 * Converts an object's keys to snake_case. This is a deep conversion.
 * @param obj The object to convert.
 * @returns A new object with snake_case keys.
 */
export function snakeCaseKeysDeep<T extends UnknownObject>(
  obj: T,
): SnakeCaseKeys<T, true> {
  return snakecaseKeys(obj, { deep: true });
}

/**
 * Converts an object's keys to snake_case. This is a shallow conversion.
 * @param obj The object to convert.
 * @returns A new object with snake_case keys at the first level.
 */
export function snakeCaseKeysShallow<T extends UnknownObject>(
  obj: T,
): SnakeCaseKeys<T, false> {
  return snakecaseKeys(obj, { deep: false });
}

/**
 * Drop all keys that have a value of the specified guard type. This is
 * a deep transformation.
 *
 * @param obj The object to drop all keys of the specified type.
 * @param exclude The type guard to drop.
 * @returns A new object with all keys of the specified type dropped.
 */
export function excludeDeep<T, TypeToExclude>(
  obj: T,
  exclude: (value: unknown) => value is TypeToExclude,
): ExcludeDeep<T, TypeToExclude> {
  // Return any values (other than objects) as is
  if (typeof obj !== "object" || obj === null) {
    return obj as ExcludeDeep<T, TypeToExclude>;
  }

  // Now, handle different types of objects in special ways
  if (Array.isArray(obj)) {
    return obj
      .filter((v) => {
        return !exclude(v);
      })
      .map((item) => {
        return excludeDeep(item, exclude);
      }) as ExcludeDeep<T, TypeToExclude>;
  }

  if (obj instanceof Map) {
    const newEntries = [...obj.entries()]
      .filter(([_, value]) => {
        return !exclude(value);
      })
      .map(([key, value]) => {
        return [key, excludeDeep(value, exclude)];
      }) as ReadonlyArray<[unknown, unknown]>;
    return new Map(newEntries) as ExcludeDeep<T, TypeToExclude>;
  }

  if (obj instanceof Set) {
    const newValues = [...obj.values()]
      .filter((v) => {
        return !exclude(v);
      })
      .map((value) => {
        return excludeDeep(value, exclude);
      }) as readonly unknown[];
    return new Set(newValues) as ExcludeDeep<T, TypeToExclude>;
  }

  if (isPlainObject(obj)) {
    const newObj: UnknownObject = {};
    Object.keys(obj).forEach((key) => {
      const val = obj[key];
      if (!exclude(val)) {
        newObj[key] = excludeDeep(val, exclude);
      }
    });
    return newObj as ExcludeDeep<T, TypeToExclude>;
  }

  // any other objects, e.g. class instances, will not be traversed
  // and we return them as is
  return obj as ExcludeDeep<T, TypeToExclude>;
}

/**
 * Swaps a type in an object recursively. This is a deep transformation.
 *
 * @param value The value to swap types in.
 * @param config The configuration for the swap.
 * @param config.isTypeToSwap A type guard to check if the current value is
 * of the type we want to swap.
 * @param config.swapWith A function that returns the value to swap in.
 * @returns The value with the type swapped.
 */
export function swapDeep<T, TypeToSwap, SwapWith>(
  value: T,
  config: {
    isTypeToSwap: (value: unknown) => value is TypeToSwap;
    swapWith: (value: TypeToSwap) => SwapWith;
  },
): SwapDeep<T, TypeToSwap, SwapWith> {
  if (config.isTypeToSwap(value)) {
    return config.swapWith(value) as SwapDeep<T, TypeToSwap, SwapWith>;
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      return swapDeep(item, config);
    }) as SwapDeep<T, TypeToSwap, SwapWith>;
  }

  if (value instanceof Map) {
    const newEntries = [...value.entries()].map(([key, v]) => {
      return [key, swapDeep(v, config)] as const;
    }) as ReadonlyArray<[unknown, unknown]>;
    return new Map(newEntries) as SwapDeep<T, TypeToSwap, SwapWith>;
  }

  if (value instanceof Set) {
    const newValues = [...value.values()].map((v) => {
      return swapDeep(v, config);
    }) as readonly unknown[];
    return new Set(newValues) as SwapDeep<T, TypeToSwap, SwapWith>;
  }

  if (isPlainObject(value)) {
    const newObj: UnknownObject = {};
    Object.keys(value).forEach((key) => {
      const v = value[key];
      newObj[key] = swapDeep(v, config);
    });
    return newObj as SwapDeep<T, TypeToSwap, SwapWith>;
  }

  return value as SwapDeep<T, TypeToSwap, SwapWith>;
}

/**
 * Drop all keys that have an `undefined` value. This is a deep transformation.
 * For Maps, the keys (which technically can be of any type) will not get
 * transformed. We only apply this function on the values.
 *
 * @param obj The object to drop all `undefined` values.
 * @returns A new object with all `undefined` values dropped.
 */
export function excludeUndefinedDeep<T extends Exclude<unknown, undefined>>(
  obj: T,
): ExcludeDeep<T, undefined> {
  return excludeDeep(obj, isUndefined);
}

/**
 * Drop all keys that have a `null` value. This is a deep transformation.
 * For Maps, the keys (which technically can be of any type) will not get
 * transformed. We only apply this function on the values.
 *
 * @param obj The object to drop all `null` values.
 * @returns A new object with all `null` values dropped.
 */
export function excludeNullsDeep<T extends Exclude<unknown, null>>(
  obj: T,
): ExcludeDeep<T, null> {
  return excludeDeep(obj, isNull);
}

export type ExcludeNullsFrom<T extends UnknownObject, K extends keyof T> = Omit<
  T,
  K
> & {
  [Key in K]: Exclude<T[Key], null>;
};

/**
 * Excludes nulls from the specified keys.
 * If no keys are specified, we assume `keysToTest` is the entire
 * object, so we will exclude nulls from all keys.
 *
 * This is a shallow operation.
 *
 * @param obj The object to exclude nulls from.
 * @param keysToTest The keys to test for null values.
 * @returns A new object with nulls excluded from the specified keys.
 */
export function excludeNullsFrom<T extends UnknownObject, K extends keyof T>(
  obj: T,
  ...keysToTest: readonly K[]
): ExcludeNullsFrom<T, K> {
  const newObj = { ...obj };
  const keys =
    keysToTest === undefined || keysToTest.length === 0 ?
      objectKeys(obj)
    : keysToTest;
  keys.forEach((key) => {
    if (isNull(obj[key])) {
      delete newObj[key];
    }
  });

  return newObj as Omit<T, K> & {
    [Key in K]: Exclude<T[Key], null>;
  };
}

export type ExcludeNullsExceptFrom<
  T extends UnknownObject,
  K extends keyof T,
  KeysToExcludeNulls extends keyof T = Exclude<keyof T, K>,
> = Omit<T, KeysToExcludeNulls> & {
  [Key in KeysToExcludeNulls]: Exclude<T[Key], null>;
};

/**
 * Excludes nulls from all keys except the specified keys. Those keys
 * will be left as is. This is a shallow operation.
 *
 * If no keys are specified, we assume `keysToKeepNull` is the entire
 * object. Therefore, the object is left unchanged.
 *
 * This is a shallow operation.
 *
 * @param obj The object to exclude nulls from.
 * @param keysToKeepNull The keys to keep nulls for.
 * @returns A new object with nulls excluded from all keys except
 * the specified keys.
 */
export function excludeNullsExceptFrom<
  T extends UnknownObject,
  K extends keyof T,
>(obj: T, ...keysToKeepNull: readonly K[]): ExcludeNullsExceptFrom<T, K> {
  if (keysToKeepNull === undefined || keysToKeepNull.length === 0) {
    return obj as ExcludeNullsExceptFrom<T, K>;
  }

  const keysToSkip: Set<string> = new Set(keysToKeepNull.map(String));
  const newObj = {} as UnknownObject;
  objectKeys(obj).forEach((key) => {
    if (keysToSkip.has(key) || !isNull(obj[key])) {
      newObj[key] = obj[key];
    }
  });
  return newObj as ExcludeNullsExceptFrom<T, K>;
}

/**
 * Swaps all `null` values to `undefined` in an object recursively.
 *
 * @param obj The object to swap nulls to undefined.
 * @returns The object with all nulls swapped to undefined.
 */
export function nullsToUndefinedDeep<T extends UnknownObject>(
  obj: T,
): SwapDeep<T, null, undefined> {
  return swapDeep(obj, {
    isTypeToSwap: isNull,
    swapWith: constant(undefined),
  });
}

/**
 * Swaps all `undefined` values to `null` in an object recursively.
 *
 * @param obj The object to swap undefineds to nulls.
 * @returns The object with all undefineds swapped to nulls.
 */
export function undefinedsToNullsDeep<T extends UnknownObject>(
  obj: T,
): SwapDeep<T, undefined, null> {
  return swapDeep(obj, {
    isTypeToSwap: isUndefined,
    swapWith: constant(null),
  });
}

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

/**
 * Maps the values of an object shallowly.
 *
 * @param obj The object to map values from.
 * @param fn The function to apply to each value.
 * @returns The object with all values mapped.
 */
export function mapObjectValues<T extends UnknownObject, V>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => V,
): { [K in keyof T]: V } {
  const newObj = {} as { [K in keyof T]: V };
  objectKeys(obj).forEach((key) => {
    newObj[key] = fn(obj[key], key);
  });
  return newObj;
}
