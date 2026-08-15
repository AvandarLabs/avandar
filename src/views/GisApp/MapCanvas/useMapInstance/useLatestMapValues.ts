import { useEffect, useRef } from "react";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { RefObject } from "react";

/** Latest values read by listeners that are registered once per map. */
export type LatestMapValues = {
  basemapRef: RefObject<AvaMap.Basemap>;
  interactiveLayerIdsRef: RefObject<readonly string[]>;
  onFeatureClickRef: RefObject<(feature: GeoJSON.Feature) => void>;
};

/** Keeps map-listener inputs current without re-registering the listeners. */
export function useLatestMapValues({
  basemap,
  interactiveLayerIds,
  onFeatureClick,
}: Readonly<{
  basemap: AvaMap.Basemap;
  interactiveLayerIds: readonly string[];
  onFeatureClick: (feature: GeoJSON.Feature) => void;
}>): LatestMapValues {
  const basemapRef = useRef(basemap);
  const interactiveLayerIdsRef = useRef(interactiveLayerIds);
  const onFeatureClickRef = useRef(onFeatureClick);
  useEffect(
    function syncLatestMapValues() {
      basemapRef.current = basemap;
      interactiveLayerIdsRef.current = interactiveLayerIds;
      onFeatureClickRef.current = onFeatureClick;
    },
    [basemap, interactiveLayerIds, onFeatureClick],
  );
  return { basemapRef, interactiveLayerIdsRef, onFeatureClickRef };
}
