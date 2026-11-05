import { isNotEmpty } from "@utils/guards/isNotEmpty/isNotEmpty.ts";
import type { NonEmpty } from "@utils/guards/isNotEmpty/isNotEmpty.ts";

/**
 * Returns a type guard that checks if a value is not empty: not `null`,
 * `undefined`, `""`, `[]`, or `{}`. See `isNotEmpty`.
 *
 * Use it where a guard factory reads better than a bare function, for example
 * `items.filter(valIsNotEmpty())`.
 *
 * @returns A function that checks if a value is not empty, narrowing it to
 * `NonEmpty<T>`.
 */
export function valIsNotEmpty(): <T>(value: T) => value is NonEmpty<T> {
  return <T>(value: T): value is NonEmpty<T> => {
    return isNotEmpty(value);
  };
}
