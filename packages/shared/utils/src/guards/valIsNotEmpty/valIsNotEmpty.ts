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
 * A record also matches `EmptyObject` through its index signature, so it is
 * branded instead, like any object whose keys are all optional.
 */
type NonEmptyObject<T> = T extends EmptyObject
  ? [Extract<keyof T, string | number>] extends [never]
    ? never
    : T & NonEmptyBrand
  : Partial<T> extends T
    ? T & NonEmptyBrand
    : T;

/**
 * The type `valIsNotEmpty` narrows `T` to. Literal unions lose `""`, arrays
 * gain a first element, `null` and `undefined` are removed, and a wide
 * `string` or an object that could be empty is branded.
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
        : NonEmptyObject<T>;

/**
 * Checks that a value is present and not empty: not `null`, `undefined`,
 * `""`, `[]`, or `{}`. Any other value, such as `0`, `false`, or a `Date`,
 * counts as not empty.
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
