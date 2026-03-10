/**
 * Returns the same value that was passed in.
 *
 * @param value The value to return.
 * @returns The same value that was passed in.
 */
export function identity<T>(value: T): T {
  return value;
}
