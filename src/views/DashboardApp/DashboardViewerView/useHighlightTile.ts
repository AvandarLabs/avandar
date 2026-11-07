import { useEffect } from "react";
import classes from "./useHighlightTile.module.css";

/** How long a linked tile stays highlighted, fade included. */
const HIGHLIGHT_DURATION_MS = 2400;

/** How long to keep looking for a tile that has not rendered yet. */
const MAX_WAIT_MS = 2000;

/**
 * Calls `onFound` with the first element matching `selector` once it is in
 * the document, checking every animation frame for up to `maxWaitMs`.
 * Returns a function that stops looking.
 */
function _waitForElement(options: {
  selector: string;
  maxWaitMs: number;
  onFound: (element: HTMLElement) => void;
}): () => void {
  const { selector, maxWaitMs, onFound } = options;
  const startedAt = Date.now();
  let frameId = 0;
  const check = (): void => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      onFound(element);
    } else if (Date.now() - startedAt < maxWaitMs) {
      frameId = window.requestAnimationFrame(check);
    }
  };
  frameId = window.requestAnimationFrame(check);
  return () => {
    window.cancelAnimationFrame(frameId);
  };
}

/**
 * Scrolls the dashboard tile whose `data-tile-id` is `tileId` into view and
 * highlights it briefly, for a link that names one tile on a dashboard, such
 * as a tile mentioned in a comment. Tiles render after their queries start,
 * so it waits briefly for the tile to appear. An unknown or absent id does
 * nothing.
 */
export function useHighlightTile(tileId: string | undefined): void {
  useEffect(() => {
    if (!tileId) {
      return undefined;
    }
    let highlightedTile: HTMLElement | undefined;
    let timerId = 0;
    const stopWaiting = _waitForElement({
      selector: `[data-tile-id="${CSS.escape(tileId)}"]`,
      maxWaitMs: MAX_WAIT_MS,
      onFound: (tile) => {
        const prefersReducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        tile.scrollIntoView({
          block: "center",
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });
        // The CSS fades the highlight out. This drops it afterwards, which
        // is all that happens under reduced motion.
        tile.classList.add(classes.highlighted!);
        highlightedTile = tile;
        timerId = window.setTimeout(() => {
          tile.classList.remove(classes.highlighted!);
        }, HIGHLIGHT_DURATION_MS);
      },
    });
    return () => {
      stopWaiting();
      window.clearTimeout(timerId);
      highlightedTile?.classList.remove(classes.highlighted!);
    };
  }, [tileId]);
}
