import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

/** The nearest ancestor, `element` included, that scrolls vertically. */
function _findScrollContainer(
  element: HTMLElement | null,
): HTMLElement | undefined {
  if (!element) {
    return undefined;
  }
  const { overflowY } = window.getComputedStyle(element);
  if (overflowY === "auto" || overflowY === "scroll") {
    return element;
  }
  return _findScrollContainer(element.parentElement);
}

/**
 * Keeps the reader's place when older entries are added above the feed.
 * Call the returned function just before requesting an earlier page; when
 * `pageCount` next changes, the scroll container is moved by however much
 * the content grew above.
 */
export function useKeepScrollOnPrepend(
  anchorRef: RefObject<HTMLElement | null>,
  pageCount: number,
): () => void {
  const distanceFromBottomRef = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    const distanceFromBottom = distanceFromBottomRef.current;
    const scrollContainer = _findScrollContainer(anchorRef.current);
    if (distanceFromBottom === undefined || !scrollContainer) {
      return;
    }
    distanceFromBottomRef.current = undefined;
    scrollContainer.scrollTop =
      scrollContainer.scrollHeight - distanceFromBottom;
  }, [anchorRef, pageCount]);

  return () => {
    const scrollContainer = _findScrollContainer(anchorRef.current);
    if (scrollContainer) {
      distanceFromBottomRef.current =
        scrollContainer.scrollHeight - scrollContainer.scrollTop;
    }
  };
}
