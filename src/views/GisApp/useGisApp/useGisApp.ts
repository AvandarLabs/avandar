import type { AvaMap } from "$/models/AvaMap/AvaMap";

import { useGisAppState } from "@/views/GisApp/useGisApp/useGisAppState";

export type { GisAppState } from "@/views/GisApp/useGisApp/useGisAppState";

/** Collects the map state, data rendering, and interaction callbacks. */
export function useGisApp(avaMap: AvaMap.T): ReturnType<typeof useGisAppState> {
  return useGisAppState(avaMap);
}
