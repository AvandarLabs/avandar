import { isDefined } from "$/lib/utils/guards/isDefined/isDefined.ts";
import { unknownToString } from "../../lib/utils/strings/unknownToString/unknownToString.ts";

type ValidURLQueryParamPrimitiveValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type ValidURLQueryParamValue =
  | ValidURLQueryParamPrimitiveValue
  | ValidURLQueryParamPrimitiveValue[];

/**
 * Builds a query string from a record of key-value pairs.
 * The returned string does not include the opening `?`. This will still
 * need to be added to the URL for HTTP requests.
 *
 * Encodings:
 * - All values are converted to strings
 * - Arrays are encoded as a semicolon-separated list of strings
 *
 * @param params - The record of key-value pairs to build the query string from.
 * @returns The query string. Empty string if `params` is empty.
 */
export function buildHTTPQueryString(
  params: Record<string, ValidURLQueryParamValue> | undefined,
): string {
  if (params === undefined) {
    return "";
  }

  const entries = Object.entries(params);
  if (entries.length === 0) {
    return "";
  }

  return entries
    .map(([key, value]) => {
      // ignore undefined values, the key should not even be included in the
      // query string, otherwise it will be encoded as an empty string (which
      // is technically still a value)
      if (value === undefined) {
        return undefined;
      }

      return `${key}=${encodeURIComponent(
        unknownToString(value, {
          arraySeparator: ";",
          emptyArrayString: "",
          emptyObjectString: "{}",
          jsonifyObject: true,
          nullString: "null",
          undefinedString: "",
          booleanTrue: "true",
          booleanFalse: "false",
        }),
      )}`;
    })
    .filter(isDefined)
    .join("&");
}
