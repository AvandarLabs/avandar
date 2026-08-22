import { useEffect, useSyncExternalStore } from "react";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import type { DuckDbSpatialAvailability } from "@/clients/DuckDbClient/DuckDbSpatialAvailability/DuckDbSpatialAvailability";

function _subscribe(listener: () => void): () => void {
  return DuckDbClient.subscribeSpatialAvailability(listener);
}

function _getSnapshot(): DuckDbSpatialAvailability {
  return DuckDbClient.getSpatialAvailability();
}

/**
 * The current DuckDB Spatial capability state.
 * This simply reports the availability status. It never asks for the
 * extension, so on its own it can sit at `"loading"` forever.
 */
export function useDuckDbSpatialAvailability(): DuckDbSpatialAvailability {
  return useSyncExternalStore(_subscribe, _getSnapshot, _getSnapshot);
}

/**
 * The DuckDB Spatial capability state, requesting the extension when it is
 * still unknown. Reading this hook is what asks for it.
 *
 * Whether Spatial is usable is only settled by asking for it, and it is asked
 * for lazily. That leaves a deadlock for any control that has to know the
 * answer before the user can create work that would need it: the geometry
 * picker cannot offer a spatial binding while the state is `"loading"`, and on
 * a map whose layers are all non-spatial nothing else ever asks, so it stays
 * `"loading"` for the life of the page.
 *
 * The request is `ensureSpatial`, not `initialize`: DuckDB starts without
 * Spatial, so initializing alone never settles this and the picker sits
 * disabled forever.
 *
 * The answer is not simply "did the download succeed". `ensureSpatial` reports
 * `"unavailable"` without any network request when the
 * `DisableDuckDbSpatial` flag is on or the selected DuckDB bundle has no
 * pthread worker, which is why the state is an availability and not a load
 * flag.
 *
 * Prefer {@link useDuckDbSpatialAvailability} where something else already
 * asks, so a screen that never offers a spatial binding does not fetch an
 * extension it never uses.
 */
export function useEnsuredSpatialAvailability(): DuckDbSpatialAvailability {
  const availability = useDuckDbSpatialAvailability();
  useEffect(
    function requestSpatialExtension() {
      if (availability !== "loading") {
        return;
      }
      void DuckDbClient.ensureSpatial().catch(() => {
        // A failed load already moves the store to "unavailable".
        return undefined;
      });
    },
    [availability],
  );
  return availability;
}
