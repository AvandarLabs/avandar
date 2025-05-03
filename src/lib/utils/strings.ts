import { isDate, isEmptyObject, isPlainObject } from "./guards";
import { objectEntries } from "./objects/misc";

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

/**
 * Converts an unknown value to a string.
 * @param value The value to convert.
 * @returns The string representation of the value.
 */
export function unknownToString(
  value: unknown,
  {
    nullString = "null",
    undefinedString = "undefined",
    emptyString = "Empty text",
    booleanTrue = "true",
    booleanFalse = "false",
    arraySeparator = ";",
    emptyArrayString = "[Empty array]",
    emptyObjectString = "{Empty object}",
    objectEntriesSeparator = "|",
  }: {
    nullString?: string;
    undefinedString?: string;
    emptyString?: string;
    booleanTrue?: string;
    booleanFalse?: string;
    arraySeparator?: string;
    emptyArrayString?: string;
    emptyObjectString?: string;
    objectEntriesSeparator?: string;
  } = {},
): string {
  if (value === null) {
    return nullString;
  }

  if (value === undefined) {
    return undefinedString;
  }

  if (value === "") {
    return emptyString;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return Intl.NumberFormat().format(value);
  }

  if (typeof value === "boolean") {
    return value ? booleanTrue : booleanFalse;
  }

  if (isDate(value)) {
    // TODO(pablo): add options to format the date
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return emptyArrayString;
    }

    return value
      .map((item) => {
        return unknownToString(item);
      })
      .join(arraySeparator);
  }

  if (isPlainObject(value)) {
    if (isEmptyObject(value)) {
      return emptyObjectString;
    }

    const keyValuePairs = objectEntries(value)
      .map(([key, v]) => {
        return `${String(key)}=${unknownToString(v)}`;
      })
      .join(objectEntriesSeparator);

    return keyValuePairs;
  }

  if (value instanceof Map) {
    const objectAsMap: Record<string, unknown> = {};
    value.forEach((v, k) => {
      objectAsMap[String(k)] = v;
    });
    const keyValuePairs = unknownToString(objectAsMap);
    return `Map<${keyValuePairs}>`;
  }

  if (value instanceof Set) {
    const internalValues = [...value.values()];
    return `Set<${unknownToString(internalValues)}>`;
  }

  return String(value);
}
