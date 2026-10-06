/**
 * How far a sticky action bar reaches up from the viewport's bottom edge.
 *
 * Measured to the bar's *top* rather than as the bar's visible height,
 * because what the checklist has to clear is the bar's upper edge and the bar
 * is pinned to the bottom of a scrolling region that need not be flush with
 * the viewport: the slate it lives in has padding below it, so a bar whose
 * height is 60px can still occupy the bottom 72px of the screen.
 *
 * Zero once the bar is scrolled past the fold, which is the case on a review
 * short enough not to scroll at all.
 */
export function getStickyActionBarIntrusionPx(options: {
  barRect: Pick<DOMRect, "top">;
  viewportHeight: number;
}): number {
  const { barRect, viewportHeight } = options;
  return Math.max(0, Math.min(viewportHeight, viewportHeight - barRect.top));
}
