import { useEffect, useRef } from "react";
import type { MapBounds } from "@/views/GisApp/layers/computeBounds/computeBounds";
import type { MapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";

/**
 * Compares two bounds by value rather than by reference, so a background
 * refetch that produces an identical bounding box in a new object does not
 * re-fly the camera and undo the user's pan.
 */
function _areBoundsEqual(
  first: MapBounds | undefined,
  second: MapBounds | undefined,
): boolean {
  if (first === second) {
    return true;
  }
  if (!first || !second) {
    return false;
  }
  return (
    first[0][0] === second[0][0] &&
    first[0][1] === second[0][1] &&
    first[1][0] === second[1][0] &&
    first[1][1] === second[1][1]
  );
}

/** Flies the camera to `fitBounds` when it changes by value. */
export function useFitMapBounds({
  mapInstance,
  fitBounds,
}: {
  mapInstance: MapInstance;
  fitBounds: MapBounds | undefined;
}): void {
  const { mapRef } = mapInstance;
  const appliedFitBoundsRef = useRef<MapBounds | undefined>(undefined);

  useEffect(
    function flyCameraToFitBounds() {
      const map = mapRef.current;
      if (!map || !fitBounds) {
        return;
      }
      if (_areBoundsEqual(appliedFitBoundsRef.current, fitBounds)) {
        return;
      }
      appliedFitBoundsRef.current = fitBounds;
      map.fitBounds(fitBounds, { padding: 50, duration: 1000 });
    },
    [fitBounds, mapRef],
  );
}
