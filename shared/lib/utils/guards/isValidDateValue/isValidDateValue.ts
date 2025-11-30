import dayjs from "dayjs";

export function isValidDateValue(v: unknown): boolean {
  if (typeof v !== "string" && typeof v !== "number" && !dayjs.isDayjs(v)) {
    return false;
  }
  const date = dayjs.isDayjs(v) ? (v as dayjs.Dayjs) : dayjs(v);
  return date.isValid();
}
