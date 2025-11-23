/** Epoch millis (very rough heuristic) */
export function isEpochMs(v: unknown): v is number {
  return typeof v === "number" && v > 1e12;
}
