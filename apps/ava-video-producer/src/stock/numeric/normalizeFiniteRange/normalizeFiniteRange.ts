/**
 * Normalize a finite value inside a strictly increasing finite range to 0..1.
 * Half-scale only overflowing spans. Invalid domains throw instead of clamping.
 */
export function normalizeFiniteRange({
  value,
  min,
  max,
}: Readonly<{ value: number; min: number; max: number }>): number {
  if (
    ![value, min, max].every(Number.isFinite) ||
    min >= max ||
    value < min ||
    value > max
  ) {
    throw new Error(
      "Expected a finite value inside an increasing finite range.",
    );
  }
  if (value === min) {
    return 0;
  }
  if (value === max) {
    return 1;
  }
  const span = max - min;
  return Number.isFinite(span)
    ? (value - min) / span
    : (value / 2 - min / 2) / (max / 2 - min / 2);
}
