/** Whether the browser requests reduced animation. */
export function isReducedMotionPreferred(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
