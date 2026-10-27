/**
 * Interpolate within finite endpoints for finite progress in 0..1.
 * Endpoint holds are exact. Invalid arguments throw without being clamped.
 */
export function interpolateFiniteRange({
  from,
  to,
  progress,
}: Readonly<{ from: number; to: number; progress: number }>): number {
  if (
    ![from, to, progress].every(Number.isFinite) ||
    progress < 0 ||
    progress > 1
  ) {
    throw new Error("Expected finite endpoints and bounded progress.");
  }
  if (progress === 0 || from === to) {
    return from;
  }
  if (progress === 1) {
    return to;
  }
  if (from < 0 === to < 0) {
    // A same-sign difference is finite. Anchor at the nearer endpoint to
    // preserve bounds without summing independently rounded large weights.
    const difference = to - from;
    return progress <= 0.5
      ? from + difference * progress
      : to - difference * (1 - progress);
  }
  // Opposite-sign weights avoid overflow in the endpoint difference.
  return from * (1 - progress) + to * progress;
}
