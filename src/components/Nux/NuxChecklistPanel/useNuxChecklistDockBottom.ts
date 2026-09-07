import { useLayoutEffect, useState } from "react";
import { getNuxChecklistDockBottomPx } from "@/components/Nux/NuxChecklistPanel/getNuxChecklistDockBottomPx/getNuxChecklistDockBottomPx";
import { getStickyActionBarIntrusionPx } from "@/components/Nux/NuxChecklistPanel/getStickyActionBarIntrusionPx/getStickyActionBarIntrusionPx";
import { STICKY_ACTION_BAR_SELECTOR } from "@/config/AppShellLayout.constants";

/**
 * The tallest intrusion among every sticky action bar currently mounted.
 *
 * Every bar rather than the first, because the app-wide dropzone opens the
 * import flow in a modal while the view behind it keeps its own bar mounted.
 * The dock has to clear whichever reaches highest.
 */
function _readStickyActionBarIntrusionPx(): number {
  const bars = document.querySelectorAll(STICKY_ACTION_BAR_SELECTOR);
  let tallest = 0;
  bars.forEach((bar) => {
    tallest = Math.max(
      tallest,
      getStickyActionBarIntrusionPx(
        bar.getBoundingClientRect(),
        window.innerHeight,
      ),
    );
  });
  return tallest;
}

function _readChecklistDockBottomPx(): number {
  return getNuxChecklistDockBottomPx({
    stickyActionBarHeightPx: _readStickyActionBarIntrusionPx(),
  });
}

/**
 * Tracks how far the checklist dock should sit from the viewport's bottom
 * edge, so it never covers a view's sticky action bar.
 *
 * The vertical counterpart to `useNuxChecklistDockRight`, and it exists for
 * the same reason: both dock in the bottom-right corner, and the corner is
 * also where a sticky bar puts its primary action. Left overlapping, the
 * card silently swallows every click on that button, which is what it did to
 * Save Dataset for anyone still running the onboarding checklist.
 *
 * Watched three ways because a bar can move without resizing: `scroll` in the
 * capture phase catches the scrolling region the bar is pinned inside (scroll
 * does not bubble, so a listener on `window` alone would never hear it), the
 * `ResizeObserver` catches the bar growing as validation errors appear above
 * it, and the `MutationObserver` catches the bar mounting at all, which is
 * what happens the moment a file finishes parsing.
 */
export function useNuxChecklistDockBottom(): number {
  const [dockBottomPx, setDockBottomPx] = useState(_readChecklistDockBottomPx);

  useLayoutEffect(function trackStickyActionBars() {
    const updateDockBottom = (): void => {
      setDockBottomPx(_readChecklistDockBottomPx());
    };

    const resizeObserver = new ResizeObserver(updateDockBottom);
    const observeBars = (): void => {
      resizeObserver.disconnect();
      document.querySelectorAll(STICKY_ACTION_BAR_SELECTOR).forEach((bar) => {
        resizeObserver.observe(bar);
      });
      updateDockBottom();
    };

    const mutationObserver = new MutationObserver(observeBars);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
    observeBars();

    window.addEventListener("scroll", updateDockBottom, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", updateDockBottom);
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("scroll", updateDockBottom, {
        capture: true,
      });
      window.removeEventListener("resize", updateDockBottom);
    };
  }, []);

  return dockBottomPx;
}
