/**
 * Compares two strings lexicographically.
 * @param a The first string to compare.
 * @param b The second string to compare.
 * @returns A negative number if `a` is less than `b`, 0 if they are equal, or
 * a positive number if `a` is greater than `b`.
 */
export function stringComparator<T extends string>(a: T, b: T): number {
  return a.localeCompare(b);
}

/**
 * Sorts an array of strings in lexicographical order.
 * @param strings The array of strings to sort.
 * @param comparator The comparator function to use for sorting.
 * @returns The sorted array of strings.
 */
export function sortStrings<T extends string>(
  strings: readonly T[],
  comparator: (a: T, b: T) => number = stringComparator,
): T[] {
  return [...strings].sort(comparator);
}
