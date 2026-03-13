/** ISO-ish string like 2024-01-21T... */
export function isISODateString(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v);
}
