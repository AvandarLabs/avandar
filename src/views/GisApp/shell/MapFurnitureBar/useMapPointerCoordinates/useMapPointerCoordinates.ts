import type maplibregl from "maplibre-gl";
import type { RefObject } from "react";

import { useEffect, useState } from "react";

/** Geographic coordinates under the pointer, in degrees. */
export type MapPointerCoordinates = { longitude: number; latitude: number };

/** Map event methods needed to track pointer coordinates. */
export type MapPointerEventSource = {
  on: (
    eventName: "mousemove" | "mouseout",
    listener: (event: maplibregl.MapMouseEvent) => void,
  ) => unknown;
  off: (
    eventName: "mousemove" | "mouseout",
    listener: (event: maplibregl.MapMouseEvent) => void,
  ) => unknown;
};

/**
 * Tracks the geographic position under the pointer while it is over the map.
 *
 * The value clears on `mouseout` so the furniture bar never presents a stale
 * coordinate as the map's current pointer position.
 */
export function useMapPointerCoordinates(
  mapInstance: Readonly<{
    mapRef: RefObject<MapPointerEventSource | undefined>;
  }>,
): MapPointerCoordinates | undefined {
  const { mapRef } = mapInstance;
  const [coordinates, setCoordinates] = useState<
    MapPointerCoordinates | undefined
  >(undefined);

  useEffect(
    function trackPointerCoordinates() {
      const map = mapRef.current;
      if (!map) {
        return undefined;
      }

      const onMouseMove = (event: maplibregl.MapMouseEvent): void => {
        setCoordinates({
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
        });
      };
      const onMouseOut = (): void => {
        setCoordinates(undefined);
      };

      map.on("mousemove", onMouseMove);
      map.on("mouseout", onMouseOut);
      return () => {
        map.off("mousemove", onMouseMove);
        map.off("mouseout", onMouseOut);
      };
    },
    [mapRef],
  );

  return coordinates;
}
