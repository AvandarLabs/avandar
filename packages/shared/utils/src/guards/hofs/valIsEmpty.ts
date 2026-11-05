import { isEmpty } from "@utils/guards/isEmpty/isEmpty.ts";
import type { Empty } from "@utils/guards/isEmpty/isEmpty.ts";

/**
 * Returns a type guard that checks if a value is empty: `null`, `undefined`,
 * `""`, `[]`, or `{}`. See `isEmpty`.
 *
 * Use it where a guard factory reads better than a bare function, for example
 * `items.filter(valIsEmpty())`.
 *
 * @returns A function that checks if a value is empty, narrowing it to
 * `Empty<T>`.
 */
export function valIsEmpty(): <T>(value: T) => value is Empty<T> {
  return <T>(value: T): value is Empty<T> => {
    return isEmpty(value);
  };
}
