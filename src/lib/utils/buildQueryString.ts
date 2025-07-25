import { unknownToString } from "./strings/transformations";

/**
 * Builds a query string from a record of key-value pairs.
 * The returned string does not include the opening `?`. This will still
 * need to be added to the URL for HTTP requests.
 *
 * @param params - The record of key-value pairs to build the query string from.
 * @returns The query string.
 */
export function buildQueryString(params: Record<string, unknown>): string {
  return Object.entries(params)
    .map(([key, value]) => {
      return `${key}=${encodeURIComponent(unknownToString(value))}`;
    })
    .join("&");
}
