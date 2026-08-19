/**
 * How much of a fixed right aside is visible inside the viewport.
 *
 * Mantine keeps the Aside in the layout while collapsed by translating it
 * off-screen, so `getBoundingClientRect().width` alone is not enough.
 */
export function getVisibleAsideWidthPx(
  asideRect: Pick<DOMRect, "left" | "right">,
  viewportWidth: number,
): number {
  return Math.max(
    0,
    Math.min(asideRect.right, viewportWidth) - Math.max(asideRect.left, 0),
  );
}
