import type { RefObject } from "react";

import { useLayoutEffect, useState } from "react";

/**
 * Live height of the canvas the drawer is docked beneath. Measured into
 * state so the separator's ARIA range is correct on the first paint.
 */
export function useCanvasAreaHeight(
  canvasRef: RefObject<HTMLElement | null>,
): number {
  const [canvasHeight, setCanvasHeight] = useState(0);

  useLayoutEffect(
    function measureCanvasArea() {
      const canvas = canvasRef.current;
      if (!canvas) {
        return undefined;
      }

      const measure = (): void => {
        setCanvasHeight(canvas.getBoundingClientRect().height);
      };
      measure();

      const observer = new ResizeObserver(measure);
      observer.observe(canvas);
      return () => {
        observer.disconnect();
      };
    },
    [canvasRef],
  );

  return canvasHeight;
}
