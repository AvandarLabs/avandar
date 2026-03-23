/**
 * Returns a function that checks if a value is equal to the given value.
 * @param value - The value to check.
 * @returns A function that checks if a value is equal to a given value.
 */
export function valEq<T>(value: T): (v: unknown) => v is T {
  return (v: unknown): v is T => {
    return v === value;
  };
}
