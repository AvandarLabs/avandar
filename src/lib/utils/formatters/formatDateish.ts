import dayjs from "dayjs";

/** ISO-ish string like 2024-01-21T... */
export function isIsoDateString(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v);
}

/** Epoch millis (very rough heuristic) */
export function isEpochMs(v: unknown): v is number {
  return typeof v === "number" && v > 1e12;
}

/** Return YYYY-MM-DD for ISO strings or epoch ms; else String(v). */
export function formatDateish(v: unknown, fmt = "YYYY-MM-DD"): string {
  if (v == null) return "";
  if (isEpochMs(v)) return dayjs(v).format(fmt);
  if (isIsoDateString(v)) return dayjs(v).format(fmt);
  return String(v);
}
