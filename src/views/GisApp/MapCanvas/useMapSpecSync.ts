import { useEffect } from "react";
import { syncMap } from "@/views/GisApp/MapCanvas/syncMap/syncMap";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { MapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";

/**
 * Applies the declarative spec to the map whenever the spec changes or a new
 * style finishes loading.
 *
 * Identity of `spec` is what gates the work, so callers must pass a memoized
 * spec: an equal-valued but freshly built object re-runs `syncMap`, which
 * removes and re-adds layers and re-uploads their GeoJSON. That is why
 * `useLayerMapSpec` memoizes every value it hands to the canvas.
 */
export function useMapSpecSync({
  mapInstance,
  spec,
}: {
  mapInstance: MapInstance;
  spec: MapSpec;
}): void {
  const { mapRef, styleLoadCount, isStyleSwapPendingRef, appliedSpecRef } =
    mapInstance;

  useEffect(
    function applyMapSpec() {
      const map = mapRef.current;
      // styleLoadCount is 0 until the first style.load, and the pending flag
      // covers the window where a swap is in flight.
      if (!map || styleLoadCount === 0 || isStyleSwapPendingRef.current) {
        return;
      }
      syncMap({ map, previousSpec: appliedSpecRef.current, nextSpec: spec });
      appliedSpecRef.current = spec;
    },
    [spec, styleLoadCount, mapRef, isStyleSwapPendingRef, appliedSpecRef],
  );
}
