/**
 * Supplies NodeTraversal with frame-specific rendering geometry or progress.
 */
export function getClampedUnitFromValue(value: number): number {
  return Math.min(1, Math.max(0, value));
}
