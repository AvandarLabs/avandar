import { useCallback, useLayoutEffect, useState } from "react";

/**
 * The width a chart is drawn at before its container has been measured, and
 * when the container has no layout to measure.
 */
const FALLBACK_WIDTH = 560;

/**
 * Follows the width of an element, so a chart can be drawn to fill it.
 * Attach `containerRef` to the element. `width` is the element's width in
 * pixels, measured before the first paint and again whenever it resizes. It
 * stays `FALLBACK_WIDTH` while the element has no width, as it does
 * in a test environment with no layout.
 */
export function useContainerWidth(): Readonly<{
  containerRef: (element: HTMLElement | null) => void;
  width: number;
}> {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  const containerRef = useCallback((element: HTMLElement | null) => {
    setContainer(element);
  }, []);

  useLayoutEffect(() => {
    if (container === null) {
      return undefined;
    }
    const updateWidth = (measuredWidth: number): void => {
      if (measuredWidth > 0) {
        setWidth(measuredWidth);
      }
    };
    // Not `getBoundingClientRect`: it follows the scale of a modal that is
    // still opening, and no resize is reported when that scale ends.
    updateWidth(container.clientWidth);
    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        updateWidth(entry.contentRect.width);
      });
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [container]);

  return { containerRef, width };
}
