import type { EmptyObject } from "@utils/types/common.types.ts";

/**
 * What `Empty` maps an object type to. An object with a required key can
 * never be empty, so it becomes `never`.
 */
type EmptyFromObject<T> = T extends EmptyObject
  ? T & EmptyObject
  : Partial<T> extends T
    ? T & EmptyObject
    : never;

/**
 * The part of `T` that is missing or empty: `""` for strings, a zero-length
 * array for arrays, `EmptyObject` for objects, and `null` or `undefined`.
 * Other primitives, such as numbers and booleans, can never be empty, so
 * they become `never`.
 */
export type Empty<T> = unknown extends T
  ? T
  : T extends null | undefined
    ? T
    : T extends string
      ? string extends T
        ? T & ""
        : Extract<T, "">
      : T extends readonly unknown[]
        ? T & readonly []
        : T extends object
          ? EmptyFromObject<T>
          : never;
