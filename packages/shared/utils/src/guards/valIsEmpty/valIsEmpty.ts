import { valIsNotEmpty } from "@utils/guards/valIsNotEmpty/valIsNotEmpty.ts";
import type { EmptyObject } from "@utils/types/common.types.ts";

/**
 * What `Empty` narrows an object type to. An object with a required key can
 * never be empty, so it becomes `never`.
 */
type EmptyFromObject<T> = T extends EmptyObject
  ? T & EmptyObject
  : Partial<T> extends T
    ? T & EmptyObject
    : never;

/**
 * The type `valIsEmpty` narrows `T` to: `""` for strings, a zero-length
 * array for arrays, `EmptyObject` for objects, and `null` or `undefined`.
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
        : EmptyFromObject<T>;

/**
 * Checks that a value is missing or empty: `null`, `undefined`, `""`, `[]`,
 * or `{}`. It is the exact opposite of `valIsNotEmpty`.
 *
 * The else branch only loses the union members that are always empty, since
 * TypeScript cannot express "a non-empty string". To narrow a value to its
 * non-empty type after an early return, use `!valIsNotEmpty(value)` instead.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is empty, narrowing it to `Empty<T>`.
 */
export function valIsEmpty<T>(value: T): value is Empty<T> {
  return !valIsNotEmpty(value);
}
