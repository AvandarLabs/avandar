import { useEffect, useSyncExternalStore } from "react";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import type { DuckDbSpatialAvailability } from "@/clients/DuckDbClient/DuckDbSpatialAvailability/DuckDbSpatialAvailability";

function _subscribe(listener: () => void): () => void {
  return DuckDbClient.subscribeSpatialAvailability(listener);
}

function _getSnapshot(): DuckDbSpatialAvailability {
  return DuckDbClient.getSpatialAvailability();
}

/** The current DuckDB Spatial capability state, without starting detection. */
export function useDuckDbSpatialAvailability(): DuckDbSpatialAvailability {
  return useSyncExternalStore(_subscribe, _getSnapshot, _getSnapshot);
}

/**
 * The DuckDB Spatial capability state, starting detection while it is unknown.
 *
 * The capability is only discovered as a side effect of initializing DuckDB,
 * and DuckDB initializes lazily on its first use. That leaves a deadlock for
 * any control that has to know the capability before the user can create work
 * that would need it: the geometry picker cannot offer a spatial binding until
 * detection has run, and on a map whose layers are all non-spatial nothing else
 * ever triggers it, so the state stays `"loading"` for the life of the page.
 * Reading the capability through this hook is itself the trigger.
 *
 * Prefer {@link useDuckDbSpatialAvailability} where something else already
 * guarantees initialization, so a map with no spatial layer does not pay for
 * DuckDB startup it never uses. The shorter name keeps the declaration inside
 * the line limit; it is the detecting form of the hook above.
 */
export function useDetectedSpatialAvailability(): DuckDbSpatialAvailability {
  const availability = useDuckDbSpatialAvailability();
  useEffect(
    function startSpatialDetection() {
      if (availability !== "loading") {
        return;
      }
      void DuckDbClient.initialize().catch(() => {
        // A failed initialization already moves the store to "unavailable".
        return undefined;
      });
    },
    [availability],
  );
  return availability;
}
