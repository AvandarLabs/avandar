import { formatDate } from "$/lib/utils/dates/formatDate/formatDate.ts";
import { isArray } from "$/lib/utils/guards/isArray/isArray.ts";
import { isDate } from "$/lib/utils/guards/isDate/isDate.ts";
import { isEmptyObject } from "$/lib/utils/guards/isEmptyObject/isEmptyObject.ts";
import { isPlainObject } from "$/lib/utils/guards/isPlainObject/isPlainObject.ts";
import { isValidDateValue } from "$/lib/utils/guards/isValidDateValue/isValidDateValue.ts";
import { objectEntries } from "$/lib/utils/objects/objectEntries/objectEntries.ts";
import { objectToPrettyString } from "$/lib/utils/objects/objectToPrettyString/objectToPrettyString.ts";
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
    emptyArrayString = "[]",
    emptyObjectString = "{}",
    objectEntriesSeparator = "|",
    asDate = false,
    dateFormat = "YYYY-MM-DDTHH:mm:ssZ",
    dateTimeZone = "local",
    prettifyObject = false,
    jsonifyObject = false,
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

  if (typeof value === "object" && value !== null) {
    if (jsonifyObject && prettifyObject) {
      return JSON.stringify(value, null, 2);
    } else if (jsonifyObject) {
      return JSON.stringify(value);
    } else if (prettifyObject) {
      return objectToPrettyString(value, options);
    }

    if (isArray(value)) {
      if (value.length === 0) {
        return emptyArrayString;
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
  }

  return String(value);
}
