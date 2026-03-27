import { parseDate } from "@utils/dates/parseDate/parseDate.ts";

/**
 * Checks whether `v` represents a valid time instant.
 *
 * - **`string`** / **`number`** - valid when `parseDate` returns a date.
 * - **`Date`** - valid when the instance is not an “Invalid Date”
 *   (`!Number.isNaN(v.getTime())`).
 * - **Anything else** - `false`.
 *
 * @param v The value to check.
 * @returns `true` if `v` is a valid date value as above.
 */
export function isValidDateValue(v: unknown): boolean {
  if (typeof v === "string" || typeof v === "number") {
    return parseDate(v) !== undefined;
  }

  if (v instanceof Date) {
    return !Number.isNaN(v.getTime());
  }

  return false;
}
