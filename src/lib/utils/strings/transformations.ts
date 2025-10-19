import { isDate, isEmptyObject, isPlainObject } from "../guards/guards";
import { objectEntries } from "../objects/misc";

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
    objectEntriesSeparator = "\n",
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
    // TODO(jpsyx): add options to format the date
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

/**
 * Converts camelCase to title case.
 * @param str The string to convert.
 * @param options Options for the conversion.
 * @param options.capitalizeFirstLetter Whether to capitalize the first letter
 *   of the string. Defaults to `true`.
 * @returns The converted string.
 */
export function camelToTitleCase(
  str: string,
  options: { capitalizeFirstLetter?: boolean } = {},
): string {
  const { capitalizeFirstLetter = true } = options;
  const processedStr = str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
  return capitalizeFirstLetter ? capitalize(processedStr) : processedStr;
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
 * Slugifies a string.
 * @param str The string to slugify.
 * @returns The slugified string.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

/**
 * Snakeifies a string.
 * @param str The string to snakeify.
 * @returns The snakeified string.
 */
export function snakeify(str: string): string {
  return str
    .toLowerCase()
    .replace(/ /g, "_")
    .replace(/-/g, "_") // also convert dashes to underscores
    .replace(/[^\w_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+/, "")
    .replace(/_+$/, "");
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
 * Joins an array of strings into a single string, with a separator and a
 * finalizing connector.
 * @param words The array of strings to join.
 * @param options
 * @param options.separator The separator to use between words. Defaults to a
 * comma.
 * @param options.endConnector The connector to use before the last word.
 * Defaults to "and".
 * @returns The joined string.
 */
export function wordJoin(
  words: readonly string[],
  {
    separator = ",",
    endConnector = "and",
  }: {
    separator?: string;
    endConnector?: string;
  } = {},
): string {
  if (words.length === 0) {
    return "";
  }

  if (words.length === 1) {
    return words[0]!;
  }

  if (words.length === 2) {
    return `${words[0]} ${endConnector} ${words[1]}`;
  }

  return `${words.slice(0, -1).join(`${separator} `)} ${endConnector} ${
    words[words.length - 1]
  }`;
}
