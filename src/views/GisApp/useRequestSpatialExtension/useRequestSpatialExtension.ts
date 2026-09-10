import { useEffect } from "react";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { useDuckDbSpatialAvailability } from "@/views/GisApp/useDuckDbSpatialAvailability";

/**
 * Asks DuckDB for the Spatial extension while the capability is still unknown.
 *
 * Whether Spatial is usable is only settled by asking for it, and it is asked
 * for lazily, so a screen that offers spatial work has to ask. Nothing else on
 * the GIS screen does: `useDuckDbSpatialAvailability` only reports the state,
 * so a map whose layers are all non-spatial would sit at `"loading"` for the
 * life of the page and leave the geometry picker permanently disabled.
 *
 * Call this once, as high in the screen as possible, and read the result
 * through {@link useDuckDbSpatialAvailability} everywhere else. It returns
 * nothing so that reading the capability and asking for it stay separate
 * decisions at the call site.
 */
export function useRequestSpatialExtension(): void {
  const availability = useDuckDbSpatialAvailability();
  useEffect(
    function requestSpatialExtensionWhileUnknown() {
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
}
