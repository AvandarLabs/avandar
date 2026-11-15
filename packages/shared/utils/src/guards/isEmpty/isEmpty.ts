import { isNotEmpty } from "@utils/guards/isNotEmpty/isNotEmpty.ts";
import type { Empty } from "@utils/types/Empty/Empty.ts";

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
