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
    throw new Error(msg);
  }
}
