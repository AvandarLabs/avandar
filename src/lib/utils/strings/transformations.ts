import { LiteralUnion } from "type-fest";
import { formatDate } from "../formatters/formatDate";
import { isValidDateValue } from "../formatters/isValidDateValue";
import {
  isArray,
  isDate,
  isEmptyObject,
  isPlainObject,
} from "../guards/guards";
import { objectEntries } from "../objects/misc";
import { objectToPrettyString } from "../objects/objectToPrettyString";

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
   * @default "[Empty array]"
   */
  emptyArrayString?: string;

  /**
   * The string to display for empty objects.
   * @default "{Empty object}"
   */
  emptyObjectString?: string;

  /**
   * The separator to use for object entries.
   * @default "|"
   */
  objectEntriesSeparator?: string;

  /**
   * If true, the object will be pretty-printed, using indentation for nesting.
   * @default false
   */
  prettifyObject?: boolean;

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
 * Converts an unknown value to a string.
 * @param value The value to convert.
 * @returns The string representation of the value.
 */
export function unknownToString(
  value: unknown,
  options: UnknownToStringOptions = {},
): string {
  const {
    nullString = "null",
    undefinedString = "undefined",
    emptyString = "Empty text",
    booleanTrue = "true",
    booleanFalse = "false",
    arraySeparator = ";",
    emptyArrayString = "[Empty array]",
    emptyObjectString = "{Empty object}",
    objectEntriesSeparator = "|",
    asDate = false,
    dateFormat = "YYYY-MM-DDTHH:mm:ssZ",
    dateTimeZone = "local",
    prettifyObject = false,
  } = options;

  if (value === null) {
    return nullString;
  }

  if (value === undefined) {
    return undefinedString;
  }

  if (value === "") {
    return emptyString;
  }

  if (typeof value === "boolean") {
    return value ? booleanTrue : booleanFalse;
  }

  if (typeof value === "string" && !asDate) {
    return value;
  }

  if (typeof value === "number" && !asDate) {
    return Intl.NumberFormat().format(value);
  }

  if (isDate(value) || (asDate && isValidDateValue(value))) {
    return formatDate(value, { format: dateFormat, zone: dateTimeZone });
  }

  if (isArray(value)) {
    if (value.length === 0) {
      return emptyArrayString;
    }

    if (prettifyObject) {
      return objectToPrettyString(value, options);
    }

    return value
      .map((item) => {
        return unknownToString(item, options);
      })
      .join(arraySeparator);
  }

  if (isPlainObject(value)) {
    if (isEmptyObject(value)) {
      return emptyObjectString;
    }

    if (prettifyObject) {
      return objectToPrettyString(value, options);
    }

    const keyValuePairs = objectEntries(value)
      .map(([key, v]) => {
        return `${String(key)}=${unknownToString(v, options)}`;
      })
      .join(objectEntriesSeparator);

    return keyValuePairs;
  }

  if (value instanceof Map) {
    const objectAsMap: Record<string, unknown> = {};
    value.forEach((v, k) => {
      objectAsMap[String(k)] = v;
    });
    const keyValuePairs = unknownToString(objectAsMap, options);
    return `Map<${keyValuePairs}>`;
  }

  if (value instanceof Set) {
    const internalValues = [...value.values()];
    return `Set<${unknownToString(internalValues, options)}>`;
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
