import { useEffect } from "react";
import { BasemapStyle } from "@/views/GisApp/basemap/BasemapStyle";
import type { MapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/**
 * Swaps the basemap style in place when it changes, leaving the map instance
 * intact.
 *
 * The swap is marked pending synchronously rather than through state, because
 * a queued state update would not be visible to the spec-sync effect running
 * later in the same commit: that effect would then push layers at a style that
 * is still loading, which MapLibre rejects. `style.load` clears the flag and
 * bumps the load count, which is what re-runs the spec sync.
 */
export function useMapStyleSync({
  mapInstance,
  basemap,
}: {
  mapInstance: MapInstance;
  basemap: AvaMapConfig.Basemap;
}): void {
  const { mapRef, appliedStyleKeyRef, isStyleSwapPendingRef } = mapInstance;

  useEffect(
    function swapBasemapStyle() {
      const map = mapRef.current;
      const nextStyleKey = BasemapStyle.toKey(basemap);
      // The key check skips the redundant swap on mount, where the constructor
      // already applied this style.
      if (!map || appliedStyleKeyRef.current === nextStyleKey) {
        return;
      }
      appliedStyleKeyRef.current = nextStyleKey;
      isStyleSwapPendingRef.current = true;
      map.setStyle(BasemapStyle.fromBasemap(basemap));
    },
    [basemap, mapRef, appliedStyleKeyRef, isStyleSwapPendingRef],
  );
}
