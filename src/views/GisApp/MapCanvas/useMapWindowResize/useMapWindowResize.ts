import type { RefObject } from "react";

import { useEffect } from "react";

type MapWithResize = {
  resize: () => void;
};

type MapResizeRef = {
  readonly current: MapWithResize | undefined;
};

/**
 * Resizes a live MapLibre map when the browser viewport or the map's canvas
 * container changes size. Container observation is what keeps the map filling
 * the surface after an in-flow drawer takes height from it.
 */
export function useMapWindowResize(
  mapRef: MapResizeRef,
  containerRef: RefObject<HTMLElement | null>,
): void {
  useEffect(
    function resizeMapWithViewportAndContainer() {
      const onResize = (): void => {
        mapRef.current?.resize();
      };
      window.addEventListener("resize", onResize);

      const container = containerRef.current;
      const observer =
        container === null ? undefined : new ResizeObserver(onResize);
      if (container !== null) {
        observer?.observe(container);
      }

      return () => {
        window.removeEventListener("resize", onResize);
        observer?.disconnect();
      };
    },
    [mapRef, containerRef],
  );
}
