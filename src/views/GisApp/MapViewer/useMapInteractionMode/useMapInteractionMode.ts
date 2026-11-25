import { useEffect } from "react";
import type { RefObject } from "react";

/** MapLibre camera gesture handlers, all turned off for a fixed picture. */
export const MAP_INTERACTION_HANDLER_NAMES = [
  "boxZoom",
  "doubleClickZoom",
  "dragPan",
  "dragRotate",
  "keyboard",
  "scrollZoom",
  "touchZoomRotate",
  "touchPitch",
] as const;

type MapInteractionTarget = Record<
  (typeof MAP_INTERACTION_HANDLER_NAMES)[number],
  { enable: () => void; disable: () => void }
>;

/**
 * Turns a map's pan, zoom, and rotate gestures on or off. Re-applies whenever
 * the map instance changes, because the instance is created after the first
 * render.
 */
export function useMapInteractionMode(
  options: Readonly<{
    mapInstance: {
      mapRef: RefObject<MapInteractionTarget | null | undefined>;
    };
    isInteractive: boolean;
  }>,
): void {
  const { mapInstance, isInteractive } = options;
  useEffect(
    function applyMapInteractionMode() {
      const map = mapInstance.mapRef.current;
      if (!map) {
        return;
      }
      MAP_INTERACTION_HANDLER_NAMES.forEach((handlerName) => {
        if (isInteractive) {
          map[handlerName].enable();
        } else {
          map[handlerName].disable();
        }
      });
    },
    [mapInstance, isInteractive],
  );
}
