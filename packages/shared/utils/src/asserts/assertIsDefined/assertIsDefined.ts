/**
 * Asserts that `value` is not undefined.
 * @param value The value to assert
 * @throws Error if `value` is undefined
 */
export function assertIsDefined<T>(
  value: T | undefined,
  msgOrOptions:
    | string
    | { name: string } = "Expected value to be defined. Received undefined.",
): asserts value is Exclude<T, undefined> {
  if (value === undefined) {
    throw new Error(
      typeof msgOrOptions === "string" ? msgOrOptions : (
        `Expected ${msgOrOptions.name} to be defined. Received undefined.`
      ),
    );
  }
}
