import { isArray } from "@utils/guards/isArray/isArray.ts";
import { isPlainObject } from "@utils/guards/isPlainObject/isPlainObject.ts";
import { objectKeys } from "@utils/objects/objectKeys.ts";
import { toSnakeCase } from "@utils/strings/toSnakeCase/toSnakeCase.ts";
import type { UnknownArray, UnknownObject } from "@utils/types/common.types.ts";
import type { SnakeCase } from "@utils/types/utilities.types.ts";

export type SnakeCaseKeys<T, IsDeep extends boolean | undefined> =
  T extends UnknownArray ?
    IsDeep extends true ?
      T extends readonly [infer ItemType] ? [SnakeCaseKeys<ItemType, true>]
      : T extends readonly [infer ItemType, infer Rest extends unknown[]] ?
        [SnakeCaseKeys<ItemType, true>, ...SnakeCaseKeys<Rest, true>]
      : T extends Array<infer ItemType> ?
        Array<
          ItemType extends UnknownObject | UnknownArray ?
            SnakeCaseKeys<ItemType, true>
          : ItemType
        >
      : T extends ReadonlyArray<infer ItemType> ?
        ReadonlyArray<
          ItemType extends UnknownObject | UnknownArray ?
            SnakeCaseKeys<ItemType, true>
          : ItemType
        >
      : never
    : // if not deep, then we return the array as is
      T
  : T extends UnknownObject ?
    IsDeep extends true ?
      {
        [K in keyof T as K extends keyof T & string ? SnakeCase<K>
        : never]: SnakeCaseKeys<T[K], true>;
      }
    : {
        [K in keyof T as K extends keyof T & string ? SnakeCase<K>
        : never]: T[K];
      }
  : T;

/**
 * Create a new object with all keys snake_cased.
 * Shallow transformation by default, unless `deep: true` is specified.
 *
 * @param obj - The object to convert keys to snake_case. This can be an array
 *   if `deep` is true.
 * @param options - The options for the conversion.
 * @param options.deep - Whether to snake_case keys deeply. Defaults to false.
 * @returns
 */
export function snakeCaseKeys<
  T extends UnknownObject | UnknownArray,
  IsDeep extends boolean | undefined = false,
>(
  obj: T,
  {
    deep = false,
  }: {
    deep?: IsDeep;
  } = {},
): SnakeCaseKeys<T, IsDeep> {
  if (isArray(obj)) {
    // if shallow, then we do nothing with an array, just return as is
    if (!deep) {
      return obj as SnakeCaseKeys<T, IsDeep>;
    }

    const array = obj;
    const newArray = array.map((item) => {
      if (isArray(item) || isPlainObject(item)) {
        return snakeCaseKeys(item, { deep: true });
      } else {
        return item;
      }
    });
    return newArray as SnakeCaseKeys<T, IsDeep>;
  }

  const newObj = {} as Record<string, unknown>;
  objectKeys(obj).forEach((key) => {
    const newKey = toSnakeCase(key);
    const value = obj[key];
    if (!deep) {
      newObj[newKey] = obj[key];
    } else {
      if (isArray(value) || isPlainObject(value)) {
        newObj[newKey] = snakeCaseKeys(value, { deep: true });
      } else {
        newObj[newKey] = value;
      }
    }
  });
  return newObj as SnakeCaseKeys<T, IsDeep>;
}

export const snakeCaseKeysDeep = <T extends UnknownObject | UnknownArray>(
  obj: T,
): SnakeCaseKeys<T, true> => {
  return snakeCaseKeys(obj, { deep: true });
};

export const snakeCaseKeysShallow = <T extends UnknownObject | UnknownArray>(
  obj: T,
): SnakeCaseKeys<T, false> => {
  return snakeCaseKeys(obj, { deep: false });
};
