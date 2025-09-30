import { Logger } from "../Logger";

/**
 * Asserts that `condition` is truthy.
 *
 * @param condition - The condition to assert.
 * @param msg - The error message to throw if the condition is falsy.
 * @throws Error if `condition` is falsy
 */
export function assert(condition: unknown, msg?: string): asserts condition {
  if (!condition) {
    const errMsg = msg ?? "Condition failed";
    Logger.error(errMsg);
    throw new Error(errMsg);
  }
}

/**
 * Asserts that `value` is not undefined.
 * @param value The value to assert
 * @throws Error if `value` is undefined
 */
export function assertIsDefined<T>(
  value: T | undefined,
  msg?: string,
): asserts value is T {
  if (value === undefined) {
    const errMsg = msg ?? "Expected value to be defined. Received undefined.";
    Logger.error(errMsg);
    throw new Error(errMsg);
  }
}

/**
 * Asserts that `value` is not null or undefined.
 * @param value The value to assert
 * @throws Error if `value` is null or undefined
 */
export function assertIsNonNullish<T>(
  value: T | null | undefined,
  msg?: string,
): asserts value is T {
  if (value === null || value === undefined) {
    const errMsg = msg ?? "Expected value to be defined";
    Logger.error(errMsg, { value });
    throw new Error(errMsg);
  }
}
