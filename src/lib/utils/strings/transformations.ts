import { capitalize } from "$/lib/utils/strings/capitalize";

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
