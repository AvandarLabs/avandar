import { Logger } from "../Logger";

/**
 * Asserts that `condition` is truthy.
 *
 * @param condition - The condition to assert.
 * @param msg - The error message to throw if the condition is falsy.
 * @throws Error if `condition` is falsy
 */
export function assert(
  condition: unknown,
  msg: string = "Condition failed",
): asserts condition {
  if (!condition) {
    Logger.error(msg);
    throw new Error(msg);
  }
}

/**
 * Asserts that `value` is not undefined.
 * @param value The value to assert
 * @throws Error if `value` is undefined
 */
export function assertIsDefined<T>(
  value: T | undefined,
  msg: string = "Expected value to be defined. Received undefined.",
): asserts value is T {
  if (value === undefined) {
    Logger.error(msg);
    throw new Error(msg);
  }
}

/**
 * Asserts that `value` is not null or undefined.
 * @param value The value to assert
 * @throws Error if `value` is null or undefined
 */
export function assertIsNonNullish<T>(
  value: T | null | undefined,
  msg: string = "Expected value to be defined",
): asserts value is T {
  if (value === null || value === undefined) {
    Logger.error(msg, { value });
    throw new Error(msg);
  }
}

/**
 * Asserts that `value` is a non-empty array.
 * @param value The value to assert
 * @throws Error if `value` is nullish or an empty array
 */
export function assertIsNonEmptyArray<T>(
  value: readonly T[] | null | undefined,
  msg: string = "Expected value to be non-empty",
): asserts value is readonly [T, ...T[]] {
  if (value === undefined || value === null || value.length === 0) {
    Logger.error(msg, { value });
    throw new Error(msg);
  }
}

/**
 * Asserts that `value` is a singleton array.
 * @param value The value to assert
 * @throws Error if `value` is nullish or not a singleton array
 */
export function assertIsSingletonArray<T>(
  value: readonly T[] | null | undefined,
  msg: string = "Expected value to be a singleton array",
): asserts value is readonly [T] {
  if (value === undefined || value === null || value.length !== 1) {
    Logger.error(msg, { value });
    throw new Error(msg);
  }
}
