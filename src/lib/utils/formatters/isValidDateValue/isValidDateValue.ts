import dayjs, { isDayjs } from "dayjs";

export function isValidDateValue(v: unknown): boolean {
  if (typeof v !== "string" && typeof v !== "number" && !isDayjs(v)) {
    return false;
  }
  const date = isDayjs(v) ? v : dayjs(v);
  return date.isValid();
}
