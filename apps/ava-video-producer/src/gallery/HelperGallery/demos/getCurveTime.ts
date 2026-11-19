/** Linear time through a curve preview: a 10-frame rest, then 45 frames. */
export function getCurveTime(frame: number): number {
  return Math.min(1, Math.max(0, (frame - 10) / 45));
}
