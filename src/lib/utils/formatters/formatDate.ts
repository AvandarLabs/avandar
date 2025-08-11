import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

/** ISO-ish string like 2024-01-21T... */
export function isIsoDateString(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v);
}

/** Epoch millis (very rough heuristic) */
export function isEpochMs(v: unknown): v is number {
  return typeof v === "number" && v > 1e12;
}

/** Return YYYY-MM-DD for ISO strings or epoch ms; else String(v). */
export function formatDate(
  value: unknown,
  format = "YYYY-MM-DD HH:mm:ss",
  zone?: string,
): string {
  if (value == null) {
    return "";
  }

  if (typeof value !== "number" && typeof value !== "string") {
    return String(value);
  }

  const date = dayjs(value);

  if (!date.isValid()) {
    return String(value);
  }

  const dateWithTimezone = zone ? date.tz(zone) : date;
  return dateWithTimezone.format(format);
}
