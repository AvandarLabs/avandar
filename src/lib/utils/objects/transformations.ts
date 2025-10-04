import camelcaseKeys, { CamelCaseKeys } from "camelcase-keys";
import snakecaseKeys, { SnakeCaseKeys } from "snakecase-keys";
import { ConditionalKeys } from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { ExcludeDeep, ReplaceTypes, SwapDeep } from "@/lib/types/utilityTypes";
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

export type ExcludeNullsIn<
  T extends UnknownObject,
  K extends keyof T = keyof T,
> = Omit<T, K> & {
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
export function excludeNullsIn<T extends UnknownObject, K extends keyof T>(
  obj: T,
  keysToTest: Extract<K, string> | readonly K[],
): ExcludeNullsIn<T, K> {
  const newObj = { ...obj };
  const keys =
    typeof keysToTest === "string" ? [keysToTest]
    : keysToTest.length === 0 ? objectKeys(obj)
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

export type ExcludeNullsExceptIn<
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
export function excludeNullsExceptIn<
  T extends UnknownObject,
  K extends keyof T,
>(
  obj: T,
  keysToKeepNull: Extract<K, string> | readonly K[],
): ExcludeNullsExceptIn<T, K> {
  const keys =
    typeof keysToKeepNull === "string" ? [keysToKeepNull] : keysToKeepNull;
  if (keys.length === 0) {
    return obj as ExcludeNullsExceptIn<T, K>;
  }
  const keysToSkip: Set<string> = new Set(keys.map(String));
  const newObj = {} as UnknownObject;
  objectKeys(obj).forEach((key) => {
    if (keysToSkip.has(key) || !isNull(obj[key])) {
      newObj[key] = obj[key];
    }
  });
  return newObj as ExcludeNullsExceptIn<T, K>;
}

/**
 * Coerces the specified keys into dates.
 *
 * @param obj The object to coerce dates from.
 * @param keys The keys to coerce into dates.
 * @returns The object with the specified keys coerced into dates.
 */
export function coerceDatesIn<T extends UnknownObject, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): {
  [Key in keyof T]: Key extends K ?
    undefined extends T[Key] ?
      Date | undefined
    : Date
  : T[Key];
} {
  const newObj = { ...obj };
  keys.forEach((key) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    newObj[key] =
      obj[key] === undefined ?
        undefined
      : new Date(obj[key] as unknown as string | number);
  });
  return newObj as ReplaceTypes<T, { [Key in K]: Date }>;
}

/**
 * Converts the specified keys into ISO strings.
 *
 * @param obj The object to convert dates from.
 * @param keys The keys to convert into ISO strings.
 * @returns The object with the specified keys converted into ISO strings.
 */
export function convertDatesToISOIn<
  T extends UnknownObject,
  K extends ConditionalKeys<T, Date | undefined>,
>(
  obj: T,
  keys: readonly K[],
): {
  [Key in keyof T]: Key extends K ?
    undefined extends T[Key] ?
      string | undefined
    : string
  : T[Key];
} {
  const newObj = { ...obj };
  keys.forEach((key) => {
    if (obj[key] instanceof Date) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      newObj[key] = obj[key].toISOString();
    }
  });
  return newObj as ReplaceTypes<T, { [Key in K]: string }>;
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

  // intentionally using a for loop here since this is a low-level
  // function that we really need to be performant if it is used
  // in huge arrays
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      newObj[key] = fn(obj[key], key);
    }
  }
  return newObj;
}
