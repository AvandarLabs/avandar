import { useSyncExternalStore } from "react";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import type { DuckDbSpatialAvailability } from "@/clients/DuckDbClient/DuckDbSpatialAvailability/DuckDbSpatialAvailability";

function _subscribe(listener: () => void): () => void {
  return DuckDbClient.subscribeSpatialAvailability(listener);
}

function _getSnapshot(): DuckDbSpatialAvailability {
  return DuckDbClient.getSpatialAvailability();
}

/**
 * Reports whether DuckDB Spatial is usable, and re-renders when that changes.
 *
 * This only reads the capability. It never asks DuckDB for the extension, so
 * on its own it can report `"loading"` for the life of the page: something has
 * to call `useRequestSpatialExtension` for the state to ever settle.
 *
 * The answer is not simply "did the download succeed". `ensureSpatial` reports
 * `"unavailable"` with no network request at all when the
 * `DisableDuckDbSpatial` flag is on or the selected DuckDB bundle has no
 * pthread worker, which is why this is an availability and not a load flag.
 */
export function useDuckDbSpatialAvailability(): DuckDbSpatialAvailability {
  return useSyncExternalStore(_subscribe, _getSnapshot, _getSnapshot);
}
