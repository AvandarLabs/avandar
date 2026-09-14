import type { UnknownObject } from "@utils/types/common.types.ts";
import type { IsObjectWithShape } from "@utils/types/IsObjectWithShape/IsObjectWithShape.types.ts";

/**
 * Filters an object based on a function. Any key-value pairs where the function
 * returns `false` will be removed from the object.
 *
 * If the `filterFn` is a type predicate, then the type-narrowing will be
 * applied to the values of the object.
 *
 * @param obj The object to filter.
 * @param filterFn The function to filter the object.
 * @returns The filtered object.
 */
export function objectFilter<T extends UnknownObject, V extends T[keyof T]>(
  obj: T,
  filterFn: (key: keyof T, value: T[keyof T]) => value is V,
): IsObjectWithShape<T> extends true
  ? { [K in keyof T as T[K] extends V ? K : never]: T[K] }
  : T extends Record<infer K, unknown>
    ? Record<K, V>
    : never;
export function objectFilter<T extends UnknownObject>(
  obj: T,
  filterFn: (key: keyof T, value: T[keyof T]) => boolean,
): T;
export function objectFilter<T extends UnknownObject>(
  obj: T,
  filterFn: (key: keyof T, value: T[keyof T]) => boolean,
): T {
  const newObj = {} as T;
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      if (filterFn(key, obj[key])) {
        newObj[key] = obj[key];
      }
    }
  }
  return newObj;
}
