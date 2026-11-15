import type { EmptyObject } from "@utils/types/common.types.ts";

declare const nonEmptyBrand: unique symbol;

/**
 * Marks a value proven non-empty when TypeScript has no type for it, such as
 * a non-empty `string` or `Record`. The key is a private symbol, so it never
 * collides with `Brand` and stays out of `keyof T & string`.
 */
type NonEmptyBrand = { readonly [nonEmptyBrand]: true };

/**
 * What `NonEmpty` maps an object type to. `EmptyObject` becomes `never`.
 * A record, `object`, and `{}` also match `EmptyObject`, so they are branded
 * instead, like any object whose keys are all optional.
 */
type NonEmptyFromObject<T> = T extends EmptyObject
  ? [keyof T] extends [never]
    ? T & NonEmptyBrand
    : [Extract<keyof T, string | number>] extends [never]
      ? never
      : T & NonEmptyBrand
  : Partial<T> extends T
    ? T & NonEmptyBrand
    : T;

/**
 * The part of `T` that can never be empty. Literal unions lose `""`, arrays
 * gain a guaranteed first element, `null` and `undefined` are removed, and a
 * wide `string`, an object that could be empty, a `Set`, or a `Map` is
 * branded. Other
 * primitives, such as numbers and booleans, are left unchanged.
 */
export type NonEmpty<T> = unknown extends T
  ? NonNullable<T>
  : T extends null | undefined
    ? never
    : T extends string
      ? string extends T
        ? T & NonEmptyBrand
        : Exclude<T, "">
      : T extends readonly unknown[]
        ? T & readonly [T[number], ...Array<T[number]>]
        : T extends ReadonlySet<unknown> | ReadonlyMap<unknown, unknown>
          ? T & NonEmptyBrand
          : T extends object
            ? NonEmptyFromObject<T>
            : T;
