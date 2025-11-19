import { formatDate } from "../../formatters/formatDate";
import { isValidDateValue } from "../../formatters/isValidDateValue";
import {
  isArray,
  isDate,
  isEmptyObject,
  isPlainObject,
} from "../../guards/guards";
import { objectEntries } from "../../objects/misc";
import { objectToPrettyString } from "../../objects/objectToPrettyString";
import { UnknownToStringOptions } from "../transformations";

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
