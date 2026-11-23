/**
 * Floor for the menu's height cap. A cap below it hides the overflow that
 * `flip` needs to see, so the menu would never move above the caret.
 */
const MIN_MENU_HEIGHT = 240;

/**
 * The tallest the `@` menu may be: the room on its side of the caret, or the
 * 240px floor when the other side has more room. The floor lets a menu
 * squeezed below the caret overflow so it flips to the roomier side, where
 * the cap becomes the room there. When the other side has no more room, the
 * floor would only push the menu off screen, so the cap is the room left.
 */
export function getMenuMaxHeight(
  options: Readonly<{
    placement: string;
    availableHeight: number;
    referenceRect: Pick<DOMRect, "top" | "bottom">;
    viewportHeight: number;
    padding: number;
  }>,
): number {
  const { placement, availableHeight, referenceRect, viewportHeight, padding } =
    options;
  const otherSideHeight = placement.startsWith("top")
    ? viewportHeight - referenceRect.bottom - padding
    : referenceRect.top - padding;
  return otherSideHeight > availableHeight
    ? Math.max(availableHeight, MIN_MENU_HEIGHT)
    : availableHeight;
}
