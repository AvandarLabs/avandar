import { useGisAppState } from "@/views/GisApp/useGisApp/useGisAppState";
import type { AvaMap } from "$/models/AvaMap/AvaMap";

export type { GisAppState } from "@/views/GisApp/useGisApp/useGisAppState";

/** Collects the map state, data rendering, and interaction callbacks. */
export function useGisApp(avaMap: AvaMap.T): ReturnType<typeof useGisAppState> {
  return useGisAppState(avaMap);
}
