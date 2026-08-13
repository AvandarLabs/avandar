/**
 * Coerces an unknown value to a finite number.
 *
 * Useful for values that arrive untyped, such as query result cells or user
 * input, where `NaN` and `Infinity` are as unusable as a non-numeric string
 * and should collapse to the same absent result.
 *
 * @param value The value to coerce.
 * @returns The number, or `undefined` when the value is neither a finite
 * number nor a string that parses to one.
 */
export function getFiniteNumberFromValue(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
