import { isArray } from "@utils/guards/isArray/isArray.ts";
import { isEmptyObject } from "@utils/guards/isEmptyObject/isEmptyObject.ts";
import { isNonEmptyArray } from "@utils/guards/isNonEmptyArray/isNonEmptyArray.ts";
import { isNonNullish } from "@utils/guards/isNonNullish/isNonNullish.ts";
import { isPlainObject } from "@utils/guards/isPlainObject/isPlainObject.ts";
import { isString } from "@utils/guards/isString/isString.ts";
import type { NonEmpty } from "@utils/types/NonEmpty/NonEmpty.ts";

/**
 * Checks that a value is present and not empty: not `null`, `undefined`,
 * `""`, `[]`, `{}`, or a `Set` or `Map` with no entries. Any other value, such as `0`, `false`, or a `Date`,
 * counts as not empty.
 *
 * Use it to skip blank optional input, for example as an early-return guard
 * on a form field or as an `Array.filter` predicate that drops empty items.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is not empty, narrowing it to `NonEmpty<T>`.
 */
export function isNotEmpty<T>(value: T): value is NonEmpty<T> {
  if (isString(value)) {
    return value !== "";
  }
  if (isArray(value)) {
    return isNonEmptyArray(value);
  }
  if (value instanceof Set || value instanceof Map) {
    return value.size > 0;
  }
  if (isPlainObject(value)) {
    return !isEmptyObject(value);
  }
  return isNonNullish(value);
}
