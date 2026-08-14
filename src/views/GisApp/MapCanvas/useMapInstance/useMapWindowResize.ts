import { useEffect } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { RefObject } from "react";

/** Resizes a live MapLibre map when its browser viewport changes. */
export function useMapWindowResize(
  mapRef: Readonly<RefObject<MapLibreMap | undefined>>,
): void {
  useEffect(
    function resizeMapWithWindow() {
      const onWindowResize = (): void => {
        mapRef.current?.resize();
      };
      window.addEventListener("resize", onWindowResize);
      return () => {
        window.removeEventListener("resize", onWindowResize);
      };
    },
    [mapRef],
  );
}
