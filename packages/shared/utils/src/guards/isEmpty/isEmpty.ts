import { isNotEmpty } from "@utils/guards/isNotEmpty/isNotEmpty.ts";
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
 * A value of type `T` proven missing or empty: `""` for strings, a
 * zero-length array for arrays, `EmptyObject` for objects, and `null` or
 * `undefined`. Other primitives, such as numbers and booleans, are never
 * empty.
 *
 * Use it to type the empty case of a value, for example the input of a
 * function that renders a placeholder.
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

/**
 * Checks that a value is missing or empty: `null`, `undefined`, `""`, `[]`,
 * or `{}`. It is the exact opposite of `isNotEmpty`.
 *
 * Use it to handle the blank case first, for example to show a placeholder
 * when a value is missing or to filter a list down to its empty entries.
 *
 * The else branch only loses the union members that are always empty, since
 * TypeScript cannot express "a non-empty string". To narrow a value to its
 * non-empty type after an early return, use `!isNotEmpty(value)` instead.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is empty, narrowing it to `Empty<T>`.
 */
export function isEmpty<T>(value: T): value is Empty<T> {
  return !isNotEmpty(value);
}
