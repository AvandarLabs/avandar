import { Logger } from "../../../Logger";
import { isNonEmptyArray } from "../guards";

/**
 * Asserts that `value` is a non-empty array.
 * @param value The value to assert
 * @param msg The error message to throw if the assertion fails
 * @throws Error if `value` is nullish or an empty array
 */
export function assertIsNonEmptyArray<T>(
  value: readonly T[] | null | undefined,
  msg: string = "Expected value to be a non-empty array",
): asserts value is readonly [T, ...T[]] {
  if (!isNonEmptyArray(value)) {
    Logger.error(msg, { value });
    throw new Error(msg);
  }
}
