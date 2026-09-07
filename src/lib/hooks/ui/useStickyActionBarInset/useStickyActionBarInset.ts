import { useLayoutEffect } from "react";
import { STICKY_ACTION_BAR_SELECTOR } from "@/config/AppShellLayout.constants";
import { getStickyActionBarIntrusionPx } from "@/lib/hooks/ui/useStickyActionBarInset/getStickyActionBarIntrusionPx/getStickyActionBarIntrusionPx";

/**
 * The CSS variable this hook publishes, in px, on the document element.
 *
 * Anything fixed to the bottom of the viewport adds it to its own offset to
 * stay clear of a view's sticky action bar:
 *
 * ```css
 * bottom: calc(
 *   var(--mantine-spacing-md) + var(--ava-sticky-action-bar-inset, 0px)
 * );
 * ```
 */
export const STICKY_ACTION_BAR_INSET_VAR = "--ava-sticky-action-bar-inset";

/**
 * The tallest intrusion among every sticky action bar currently mounted.
 *
 * Every bar rather than the first, because the app-wide dropzone opens the
 * import flow in a modal while the view behind it keeps its own bar mounted.
 * Whatever is fixed to the bottom has to clear whichever reaches highest.
 */
function _readTallestIntrusionPx(): number {
  let tallest = 0;
  document.querySelectorAll(STICKY_ACTION_BAR_SELECTOR).forEach((bar) => {
    tallest = Math.max(
      tallest,
      getStickyActionBarIntrusionPx({
        barRect: bar.getBoundingClientRect(),
        viewportHeight: window.innerHeight,
      }),
    );
  });
  return tallest;
}

/**
 * Publishes how far a view's sticky action bar reaches up from the bottom of
 * the viewport, as a CSS variable on the document element.
 *
 * Mount once, app-wide. It exists because the things that pin themselves to
 * the bottom of the viewport are not the things that know a bar is there:
 * toast notifications live in a portal at the root of the app, and a bar
 * belongs to whichever view is open. Publishing the measurement as a variable
 * lets each of them offset itself in CSS, so a scroll costs a style
 * recalculation rather than a re-render of the application.
 *
 * Watched three ways because a bar can move without resizing: capture-phase
 * `scroll` catches the region the bar is pinned inside (scroll does not
 * bubble, so a listener on `window` alone would never hear it), the
 * `ResizeObserver` catches the bar growing as validation errors appear above
 * it, and the `MutationObserver` catches the bar mounting at all, which is
 * what happens the moment a file finishes parsing.
 */
export function useStickyActionBarInset(): void {
  useLayoutEffect(function publishStickyActionBarInset() {
    const root = document.documentElement;
    let published = -1;

    const update = (): void => {
      const inset = _readTallestIntrusionPx();
      // Writing an unchanged value would still invalidate style on every
      // scroll frame, and this runs on all of them.
      if (inset === published) {
        return;
      }
      published = inset;
      root.style.setProperty(STICKY_ACTION_BAR_INSET_VAR, `${inset}px`);
    };

    const resizeObserver = new ResizeObserver(update);
    const observeBars = (): void => {
      resizeObserver.disconnect();
      document.querySelectorAll(STICKY_ACTION_BAR_SELECTOR).forEach((bar) => {
        resizeObserver.observe(bar);
      });
      update();
    };

    const mutationObserver = new MutationObserver(observeBars);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    observeBars();

    window.addEventListener("scroll", update, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", update);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
      root.style.removeProperty(STICKY_ACTION_BAR_INSET_VAR);
    };
  }, []);
}
