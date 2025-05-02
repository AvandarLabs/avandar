/**
 * This file consists of miscellaneous helper functions that don't
 * quite fit in any other category.
 */

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
 * Casts a value to a specific type. Use this sparingly and only
 * when you are completely sure it is safe to use.
 *
 * @param value The value to cast.
 * @returns The cast value with the new type.
 */
export function cast<T>(value: unknown): T {
  return value as T;
}
