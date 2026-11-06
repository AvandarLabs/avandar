/**
 * Returns exact fractional shares without inventing or rounding token counts.
 */
export function getQuantitySegmentsFromValues({
  values,
  denominator,
}: Readonly<{
  values: readonly number[];
  denominator: number;
}>): Array<{ value: number; start: number; fraction: number }> {
  if (
    !Number.isFinite(denominator) ||
    denominator <= 0 ||
    values.some((value) => !Number.isFinite(value) || value < 0)
  ) {
    throw new Error(
      "Quantities must be finite and nonnegative with a positive denominator.",
    );
  }
  const allocatedTotal = values.reduce((sum, value) => sum + value, 0);
  const tolerance =
    Number.EPSILON *
    Math.max(denominator, allocatedTotal) *
    Math.max(1, values.length);
  if (
    !Number.isFinite(allocatedTotal) ||
    allocatedTotal - denominator > tolerance
  ) {
    throw new Error("Authored quantities cannot exceed their denominator.");
  }
  return values.map((value, index) => ({
    value,
    start:
      values.slice(0, index).reduce((total, amount) => total + amount, 0) /
      denominator,
    fraction: value / denominator,
  }));
}
