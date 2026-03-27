import { isArray } from "@utils/guards/isArray/isArray.ts";
import { isPlainObject } from "@utils/guards/isPlainObject/isPlainObject.ts";
import { objectKeys } from "@utils/objects/objectKeys.ts";
import { toCamelCase } from "@utils/strings/toCamelCase/toCamelCase.ts";
import type { UnknownArray, UnknownObject } from "@utils/types/common.types.ts";
import type { CamelCase } from "@utils/types/utilities.types.ts";

export type CamelCaseKeys<T, IsDeep extends boolean | undefined = false> =
  T extends UnknownArray ?
    IsDeep extends true ?
      T extends readonly [infer ItemType] ? [CamelCaseKeys<ItemType, true>]
      : T extends readonly [infer ItemType, infer Rest extends unknown[]] ?
        [CamelCaseKeys<ItemType, true>, ...CamelCaseKeys<Rest, true>]
      : T extends Array<infer ItemType> ?
        Array<
          ItemType extends UnknownObject | UnknownArray ?
            CamelCaseKeys<ItemType, true>
          : ItemType
        >
      : T extends ReadonlyArray<infer ItemType> ?
        ReadonlyArray<
          ItemType extends UnknownObject | UnknownArray ?
            CamelCaseKeys<ItemType, true>
          : ItemType
        >
      : never
    : // if not deep, then we return the array as is
      T
  : T extends UnknownObject ?
    IsDeep extends true ?
      {
        [K in keyof T as K extends keyof T & string ? CamelCase<K>
        : never]: CamelCaseKeys<T[K], true>;
      }
    : {
        [K in keyof T as K extends keyof T & string ? CamelCase<K>
        : never]: T[K];
      }
  : T;

/**
 * Create a new object with all keys camelCased.
 * Shallow transformation by default, unless `deep: true` is specified.
 *
 * @param obj - The object to convert keys to camelCase. This can be an array
 *   if `deep` is true.
 * @param options - The options for the conversion.
 * @param options.deep - Whether to camelCase keys deeply. Defaults to false.
 * @returns
 */
export function camelCaseKeys<
  T extends UnknownObject | UnknownArray,
  IsDeep extends boolean | undefined = false,
>(
  obj: T,
  {
    deep = false,
  }: {
    deep?: IsDeep;
  } = {},
): CamelCaseKeys<T, IsDeep> {
  if (isArray(obj)) {
    // if shallow, then we do nothing with an array, just return as is
    if (!deep) {
      return obj as CamelCaseKeys<T, IsDeep>;
    }

    const array = obj;
    const newArray = array.map((item) => {
      if (isArray(item) || isPlainObject(item)) {
        return camelCaseKeys(item, { deep: true });
      } else {
        return item;
      }
    });
    return newArray as CamelCaseKeys<T, IsDeep>;
  }

  const newObj = {} as Record<string, unknown>;
  objectKeys(obj).forEach((key) => {
    const newKey = toCamelCase(key);
    const value = obj[key];
    if (!deep) {
      newObj[newKey] = obj[key];
    } else {
      if (isArray(value) || isPlainObject(value)) {
        newObj[newKey] = camelCaseKeys(value, { deep: true });
      } else {
        newObj[newKey] = value;
      }
    }
  });
  return newObj as CamelCaseKeys<T, IsDeep>;
}

export const camelCaseKeysDeep = <T extends UnknownObject | UnknownArray>(
  obj: T,
): CamelCaseKeys<T, true> => {
  return camelCaseKeys(obj, { deep: true });
};

export const camelCaseKeysShallow = <T extends UnknownObject | UnknownArray>(
  obj: T,
): CamelCaseKeys<T, false> => {
  return camelCaseKeys(obj, { deep: false });
};
