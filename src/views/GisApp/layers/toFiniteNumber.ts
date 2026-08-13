/**
 * Coerces a raw query-result cell to a finite number.
 *
 * @returns The number, or `undefined` when the value is neither a finite
 * number nor a string that parses to one.
 */
export function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
