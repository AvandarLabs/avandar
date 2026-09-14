import { isDefined, unknownToString } from "@avandar/utils";

type ValidUrlQueryParamPrimitiveValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type ValidUrlQueryParamValue =
  | ValidUrlQueryParamPrimitiveValue
  | ValidUrlQueryParamPrimitiveValue[];

/**
 * How a single value is written into a URL.
 *
 * These options exist to undo `unknownToString`'s display defaults, every one
 * of which is wrong here. Formatted numbers put thousands separators in a
 * `gid`, and the separator changes with the runtime's locale. `Empty text`
 * turns an empty search box into a search for those two words. Both produce a
 * request that succeeds and asks for the wrong thing.
 */
const URL_VALUE_OPTIONS = {
  emptyString: "",
  nullString: "null",
  undefinedString: "",
  booleanTrue: "true",
  booleanFalse: "false",
  formatNumbers: false,
} as const;

/** The separator between the members of an array value. */
const ARRAY_SEPARATOR = ";";

/** Writes one value as the text that follows `key=`. */
function _valueToString(value: ValidUrlQueryParamValue): string {
  // Arrays are joined here rather than handed to `unknownToString`, which
  // reaches its JSON branch before its array branch and would write
  // `["a","b"]`.
  if (Array.isArray(value)) {
    return value
      .map((member) => {
        return unknownToString(member, URL_VALUE_OPTIONS);
      })
      .join(ARRAY_SEPARATOR);
  }

  return unknownToString(value, URL_VALUE_OPTIONS);
}

/**
 * Builds a query string from a record of key-value pairs.
 *
 * The returned string does not include the opening `?`, which the caller adds.
 *
 * Encodings:
 * - Values are percent-encoded; keys are written as given, because a key is
 *   code rather than user input.
 * - Numbers are written as digits, never through `Intl.NumberFormat`.
 * - Arrays become a `;`-separated list of their members.
 * - An `undefined` value omits its key entirely. `null` and the empty string
 *   are values, and are sent.
 *
 * @param params The record of key-value pairs to build the query string from.
 * @returns The query string. Empty string if `params` is empty or absent.
 */
export function buildHttpQueryString(
  params: Record<string, ValidUrlQueryParamValue> | undefined,
): string {
  if (params === undefined) {
    return "";
  }

  return Object.entries(params)
    .map(([key, value]) => {
      // An absent value drops its key. Sending `key=` instead would say "this
      // is set, and it is empty", which is a different request.
      if (value === undefined) {
        return undefined;
      }

      return `${key}=${encodeURIComponent(_valueToString(value))}`;
    })
    .filter(isDefined)
    .join("&");
}
