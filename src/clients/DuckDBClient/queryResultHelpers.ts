import { UnknownObject } from "@/lib/types/common";
import {
  assertIsNonEmptyArray,
  assertIsSingletonArray,
} from "@/lib/utils/asserts";
import { objectKeys } from "@/lib/utils/objects/misc";
import { QueryResultData } from "./types";

/**
 * Returns the singular scalar value from a single-column row.
 *
 * @param query The query result to extract the scalar value from.
 * @returns The scalar value of the query result
 * @throws If the query result has multiple rows, no rows, or the
 * row contains more than one column.
 */
export function scalar<V, T extends { [key: string]: V }>(
  query: QueryResultData<T>,
): V {
  assertIsNonEmptyArray(query.data, "No data found");
  assertIsSingletonArray(
    query.data,
    "Multiple rows found. A scalar requires a single row.",
  );
  const firstRow = query.data[0]!;
  const keys = objectKeys(firstRow);
  assertIsNonEmptyArray(
    keys,
    "Received an empty row. A scalar requires a value.",
  );
  assertIsSingletonArray(
    keys,
    "Multiple columns found. A scalar requires a single column.",
  );
  return firstRow[keys[0]!]!;
}

/**
 * Returns the first row of the query result, or `undefined` if
 * the array is empty.
 *
 * @param query The query result to return the first row from.
 * @returns The first row of the query result or undefined.
 * @throws If the result has more than one element.
 */
export function singleton<T extends UnknownObject>(
  query: QueryResultData<T>,
): T | undefined {
  if (query.data.length === 0) {
    return undefined;
  }
  assertIsSingletonArray(
    query.data,
    "Multiple rows found. A singleton requires a single row.",
  );
  return query.data[0]!;
}
