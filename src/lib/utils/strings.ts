/**
 * Compares two strings lexicographically.
 * @param a The first string to compare.
 * @param b The second string to compare.
 * @returns A negative number if `a` is less than `b`, 0 if they are equal, or
 * a positive number if `a` is greater than `b`.
 */
export function stringComparator(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Sorts an array of strings in lexicographical order.
 * @param strings The array of strings to sort.
 * @returns The sorted array of strings.
 */
export function sortStrings(strings: readonly string[]): string[] {
  return [...strings].sort(stringComparator);
}

/**
 * Converts camelCase to title case.
 * @param str The string to convert.
 * @returns The converted string.
 */
export function camelToTitleCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
}

/**
 * Capitalizes the first letter of a string.
 * @param str The string to capitalize.
 * @returns The capitalized string.
 */
export function capitalize<T extends string>(str: T): Capitalize<T> {
  return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>;
}

/**
 * Prefixes a string with a given prefix.
 * @param prefixStr The prefix to add.
 * @param str The string to prefix.
 * @returns The prefixed string.
 */
export function prefix<Prefix extends string, T extends string>(
  prefixStr: Prefix,
  str: T,
): `${Prefix}${T}` {
  return `${prefixStr}${str}`;
}
