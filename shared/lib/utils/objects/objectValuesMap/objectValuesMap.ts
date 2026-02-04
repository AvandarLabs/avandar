import type { UnknownObject } from "$/lib/types/common.ts";

/**
 * Maps the values of an object shallowly.
 *
 * @param obj The object to map values from.
 * @param fn The function to apply to each value.
 * @param options The options for the mapping.
 * @param options.excludeUndefined If true, any keys where `fn` returns
 * `undefined` will be dropped from the result. Defaults to false.
 * @returns The object with all values mapped.
 */
export function objectValuesMap<T extends UnknownObject, V>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => V,
  options?: { excludeUndefined?: false },
): { [K in keyof T]: V };
export function objectValuesMap<T extends UnknownObject, V>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => V,
  options: { excludeUndefined: true },
): { [K in keyof T]: Exclude<V, undefined> };
export function objectValuesMap<T extends UnknownObject, V>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => V,
  options: {
    /**
     * Whether to exclude undefined values from the result.
     * If true, any keys where `fn` returns `undefined` will be dropped
     * from the result.
     * @default false
     */
    excludeUndefined?: boolean;
  } = {},
): {
  [K in keyof T]: V;
} {
  const { excludeUndefined = false } = options;
  const newObj = {} as { [K in keyof T]: V };

  // intentionally using a for loop here since this is a low-level
  // function that we really need to be performant if it is used
  // in huge arrays
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      const mappedValue = fn(obj[key], key);
      if (excludeUndefined && mappedValue === undefined) {
        continue;
      }
      newObj[key] = mappedValue;
    }
  }
  return newObj;
}
