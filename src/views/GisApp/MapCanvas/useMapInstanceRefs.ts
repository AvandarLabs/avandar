import { useRef } from "react";
import { EMPTY_MAP_SPEC } from "@/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers";
import type { MapInstanceRefs } from "@/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers";
import type { Map as MapLibreMap } from "maplibre-gl";

/** Creates the mutable refs owned by one MapLibre canvas instance. */
export function useMapInstanceRefs(): MapInstanceRefs {
  return {
    mapRef: useRef<MapLibreMap | undefined>(undefined),
    appliedSpecRef: useRef(EMPTY_MAP_SPEC),
    appliedStyleKeyRef: useRef<string | undefined>(undefined),
    isStyleSwapPendingRef: useRef(false),
  };
}
