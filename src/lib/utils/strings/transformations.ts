import { capitalize } from "../../../../shared/lib/utils/strings/capitalize/capitalize";
import type { LiteralUnion } from "type-fest";

export type UnknownToStringOptions = {
  /**
   * The string to display for null values.
   * @default "null"
   */
  nullString?: string;

  /**
   * The string to display for undefined values.
   * @default "undefined"
   */
  undefinedString?: string;

  /**
   * The string to display for empty strings.
   * @default "Empty text"
   */
  emptyString?: string;

  /**
   * The string to display for boolean true values.
   * @default "true"
   */
  booleanTrue?: string;

  /**
   * The string to display for boolean false values.
   * @default "false"
   */
  booleanFalse?: string;

  /**
   * The separator to use for array values.
   * @default ";"
   */
  arraySeparator?: string;

  /**
   * The string to display for empty arrays.
   * @default "[]"
   */
  emptyArrayString?: string;

  /**
   * The string to display for empty objects.
   * @default "{}"
   */
  emptyObjectString?: string;

  /**
   * The separator to use for object entries. This is ignored if we are using
   * `prettifyObject` or `jsonifyObject`.
   * @default "|"
   */
  objectEntriesSeparator?: string;

  /**
   * If true, the object will be pretty-printed, using indentation for nesting.
   * This applies to any value whose `typeof` is `'object'` (except 'null'). So,
   * for example, this applies to arrays (not just plain objects).
   *
   * @default false
   */
  prettifyObject?: boolean;

  /**
   * If true, an object will be converted to a JSON string with JSON.stringify
   * rather than iterating recursively.
   *
   * This applies to any value whose `typeof` is `'object'` (except 'null'). So,
   * for example, this applies to arrays (not just plain objects).
   *
   * If `prettifyObject` is true then `JSON.stringify` will be called with the
   * arguments `JSON.stringify(value, null, 2)` (i.e. a 2-space indent is used
   * for pretty-printing).
   *
   * @default false
   */
  jsonifyObject?: boolean;

  /**
   * If true, we test strings and numbers to see if they are valid dates,
   * before we allow them to be returned as-is. Defaults to false.
   * @default false
   */
  asDate?: boolean;

  /**
   * The format to use for dates.
   * @default "YYYY-MM-DDTHH:mm:ssZ" (ISO 8601 format)
   */
  dateFormat?: string;

  /**
   * The timezone to use for dates.
   * @default "local"
   */
  dateTimeZone?: LiteralUnion<"UTC" | "local", string>;
};

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
