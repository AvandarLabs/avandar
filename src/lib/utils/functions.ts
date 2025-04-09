/**
 * Literally do nothing.
 */
export function noop(): void {
  // Do nothing
  return;
}

/**
 * Returns the same value that was passed in.
 *
 * @param value The value to return.
 * @returns The same value that was passed in.
 */
export function identity<T>(value: T): T {
  return value;
}

/**
 * Returns a function that always returns the same value.
 *
 * **Examples**
 *
 * ```ts
 * constant(42); // () => number
 * constant(42 as const); // () => 42
 * constant("hello"); // () => string
 * constant("hello" as const); // () => "hello"
 * ```
 *
 * @param value The value to return.
 * @returns A function that always returns the same value.
 */
export function constant<T>(value: T): () => T {
  return () => {
    return value;
  };
}
