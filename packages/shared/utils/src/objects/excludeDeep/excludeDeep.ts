import { isPlainObject } from "@utils/guards/isPlainObject/isPlainObject.ts";
import type { UnknownObject } from "@utils/types/common.types.ts";
import type { ExcludeDeep } from "@utils/types/utilities.types.ts";

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
      const val = obj[key as keyof typeof obj];
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
