import { isArray } from "@utils/guards/isArray/isArray.ts";
import { isEmptyObject } from "@utils/guards/isEmptyObject/isEmptyObject.ts";
import { isNonEmptyArray } from "@utils/guards/isNonEmptyArray/isNonEmptyArray.ts";
import { isNonNullish } from "@utils/guards/isNonNullish/isNonNullish.ts";
import { isPlainObject } from "@utils/guards/isPlainObject/isPlainObject.ts";
import { isString } from "@utils/guards/isString/isString.ts";
import type { EmptyObject } from "@utils/types/common.types.ts";

declare const nonEmptyBrand: unique symbol;

/**
 * Marks a value proven non-empty when TypeScript has no type for it, such as
 * a non-empty `string` or `Record`. The key is a private symbol, so it never
 * collides with `Brand` and stays out of `keyof T & string`.
 */
type NonEmptyBrand = { readonly [nonEmptyBrand]: true };

/**
 * What `NonEmpty` narrows an object type to. `EmptyObject` becomes `never`.
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
 * A value of type `T` proven not empty. Literal unions lose `""`, arrays
 * gain a first element, `null` and `undefined` are removed, and a wide
 * `string` or an object that could be empty is branded. Other primitives,
 * such as numbers and booleans, are left unchanged.
 *
 * Use it to type a parameter that callers must check first, for example a
 * helper that only accepts a list with at least one item.
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
        : T extends object
          ? NonEmptyFromObject<T>
          : T;

/**
 * Checks that a value is present and not empty: not `null`, `undefined`,
 * `""`, `[]`, or `{}`. Any other value, such as `0`, `false`, or a `Date`,
 * counts as not empty.
 *
 * Use it to skip blank optional input, for example as an early-return guard
 * on a form field or as an `Array.filter` predicate that drops empty items.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is not empty, narrowing it to `NonEmpty<T>`.
 */
export function valIsNotEmpty<T>(value: T): value is NonEmpty<T> {
  if (isString(value)) {
    return value !== "";
  }
  if (isArray(value)) {
    return isNonEmptyArray(value);
  }
  if (isPlainObject(value)) {
    return !isEmptyObject(value);
  }
  return isNonNullish(value);
}
