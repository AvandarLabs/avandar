import { useRef } from "react";
import { MapInstanceHelpers } from "@/views/GisApp/MapCanvas/MapInstanceHelpers";
import type { MapInstanceRefs } from "@/views/GisApp/MapCanvas/MapInstanceHelpers";
import type { Map as MapLibreMap } from "maplibre-gl";

/** Creates the mutable refs owned by one MapLibre canvas instance. */
export function useMapInstanceRefs(): MapInstanceRefs {
  return {
    mapRef: useRef<MapLibreMap | undefined>(undefined),
    appliedSpecRef: useRef(MapInstanceHelpers.emptySpec),
    appliedStyleKeyRef: useRef<string | undefined>(undefined),
    isStyleSwapPendingRef: useRef(false),
  };
}
