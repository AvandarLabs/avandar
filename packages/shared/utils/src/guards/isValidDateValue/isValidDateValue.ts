import dayjs from "dayjs";

/**
 * Checks if a value is a valid date.
 * @param v - The value to check.
 * @returns `true` if `v` is a valid date, `false` otherwise.
 */
export function isValidDateValue(v: unknown): boolean {
  if (typeof v !== "string" && typeof v !== "number" && !dayjs.isDayjs(v)) {
    return false;
  }
  const date = dayjs.isDayjs(v) ? (v as dayjs.Dayjs) : dayjs(v);
  return date.isValid();
}
