import { useGisAppState } from "@/views/GisApp/useGisApp/useGisAppState";
import type { AvaMap } from "$/models/AvaMap/AvaMap";

export type { GisAppState } from "@/views/GisApp/useGisApp/useGisAppState";

/**
 * Collects the map state, data rendering, and interaction callbacks.
 * `jitterSalt` displaces the map's jittered points.
 */
export function useGisApp(
  avaMap: AvaMap.T,
  jitterSalt: string,
): ReturnType<typeof useGisAppState> {
  return useGisAppState(avaMap, jitterSalt);
}
