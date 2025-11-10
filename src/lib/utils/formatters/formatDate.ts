import dayjs, { isDayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { LiteralUnion } from "type-fest";

dayjs.extend(utc);
dayjs.extend(timezone);

export type FormattableTimezone = LiteralUnion<"local" | "UTC", string>;

/** ISO-ish string like 2024-01-21T... */
export function isIsoDateString(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v);
}

/** Epoch millis (very rough heuristic) */
export function isEpochMs(v: unknown): v is number {
  return typeof v === "number" && v > 1e12;
}

export function isValidDateValue(v: unknown): boolean {
  if (typeof v !== "string" && typeof v !== "number" && !isDayjs(v)) {
    return false;
  }
  const date = isDayjs(v) ? v : dayjs(v);
  return date.isValid();
}

/**
 * For values that parse into a valid date (deterined by just passing directly
 * into `dayjs()`), we will return the date formatted according to the
 * passed `format`. Otherwise, we just return `String(value)`.
 *
 * @param value The value to format.
 * @param options The options to use.
 * @param options.format The format to use. Defaults to ISO 8601.
 * @param options.zone The timezone to use. Defaults to "local", meaning that
 * the local timezone will be used, as determined by `dayjs`. Otherwise, any
 * valid timezone string can be passed, such as "UTC" or "America/New_York".
 * @returns The formatted date.
 */
export function formatDate(
  value: unknown,
  {
    zone = "local",
    format = "YYYY-MM-DDTHH:mm:ssZ",
  }: {
    zone?: FormattableTimezone;
    format?: string;
  } = {},
): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (
    typeof value !== "number" &&
    typeof value !== "string" &&
    !isDayjs(value)
  ) {
    return String(value);
  }

  const date = isDayjs(value) ? value : dayjs(value);
  if (!date.isValid()) {
    return String(value);
  }

  const dateWithTimezone =
    zone ?
      date.tz(zone === "local" ? undefined : zone, zone === "local")
    : date.utc();
  return dateWithTimezone.format(format);
}
