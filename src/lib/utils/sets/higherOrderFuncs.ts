/**
 * Returns a function that checks if a value is in a set.
 *
 * @param set The set to check against.
 * @returns A function that returns true if the value is in the set.
 */
export function isInSet<T>(set: Set<T>): (value: T) => boolean {
  return (value: T): boolean => {
    return set.has(value);
  };
}

/**
 * Returns a function that checks if a value is not in a set.
 *
 * @param set The set to check against.
 * @returns A function that returns true if the value is not in the set.
 */
export function isNotInSet<T>(set: Set<T>): (value: T) => boolean {
  return (value: T): boolean => {
    return !set.has(value);
  };
}
