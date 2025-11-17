import { unknownToString } from "./strings/unknownToString/unknownToString";

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
 * @param params - The record of key-value pairs to build the query string from.
 * @returns The query string.
 */
export function buildHTTPQueryString(
  params: Record<string, ValidURLQueryParamValue>,
): string {
  return Object.entries(params)
    .map(([key, value]) => {
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
    .join("&");
}
