import type { NuxAnchor } from "@/components/Nux/NuxAnchors/NuxAnchors";

import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";

const SCROLLABLE_OVERFLOW = /auto|scroll/;

/**
 * The nearest ancestor that actually scrolls, including Mantine ScrollArea's
 * viewport. Window/document are ignored: the Data Sources app scrolls inside
 * a nested pane, not the page.
 */
function _nearestScrollParent(element: HTMLElement): HTMLElement | null {
  let ancestor = element.parentElement;
  while (ancestor !== null && ancestor !== document.body) {
    // Mantine ScrollArea (Radix) puts overflow:hidden on the viewport and
    // still scrolls it. Overflow checks alone miss that node.
    if (ancestor.hasAttribute("data-radix-scroll-area-viewport")) {
      return ancestor;
    }
    const style = getComputedStyle(ancestor);
    if (
      SCROLLABLE_OVERFLOW.test(style.overflowY) ||
      SCROLLABLE_OVERFLOW.test(style.overflow)
    ) {
      return ancestor;
    }
    ancestor = ancestor.parentElement;
  }
  return null;
}

/**
 * Resets the internal scroller that contains this anchor to the top.
 *
 * After saving a dataset the Data Sources `ScrollArea` is still sitting where
 * the import form's Save button was. The payoff tooltip then spotlights the
 * Data Summary tab at the wrong viewport coordinates.
 */
export function scrollNuxAnchorScrollParentToTop(anchor: NuxAnchor): void {
  const target = document.querySelector(NuxAnchors.selector(anchor));
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const scroller = _nearestScrollParent(target);
  if (scroller === null) {
    return;
  }
  if (typeof scroller.scrollTo === "function") {
    scroller.scrollTo({ top: 0, behavior: "instant" });
  }
  scroller.scrollTop = 0;
}
