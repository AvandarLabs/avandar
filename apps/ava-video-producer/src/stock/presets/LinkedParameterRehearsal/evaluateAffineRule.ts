/**
 * Evaluate a finite affine rule, retaining finite overflow-cancellation
 * results.
 */
export function evaluateAffineRule({
  source,
  multiplier,
  offset,
}: Readonly<{ source: number; multiplier: number; offset: number }>): number {
  const product = multiplier * source;
  return Number.isFinite(product)
    ? product + offset
    : ((multiplier / 2) * source + offset / 2) * 2;
}
