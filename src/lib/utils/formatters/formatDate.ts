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
  v: unknown,
  fmt = "YYYY-MM-DD HH:mm:ss z",
  zone?: string,
): string {
  if (v == null) return "";

  let d;
  if (typeof v === "number") {
    d = dayjs(v);
  } else if (typeof v === "string") {
    d = dayjs(v);
  } else {
    return String(v);
  }

  if (!d.isValid()) return String(v);

  const t = zone ? d.tz(zone) : d;
  return t.format(fmt);
}
