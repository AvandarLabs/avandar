import { useEffect, useRef } from "react";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ClusterSelection } from "@/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { RefObject } from "react";

/** Receives a feature together with the MapLibre layer that rendered it. */
export type MapFeatureClickHandler = (
  feature: GeoJSON.Feature,
  renderedLayerId: string,
) => void;

/** Receives the identity of a clicked cluster. */
export type MapClusterClickHandler = (cluster: ClusterSelection) => void;

/** Latest values read by listeners that are registered once per map. */
export type LatestMapValues = {
  basemapRef: RefObject<AvaMapConfig.Basemap>;
  interactiveLayerIdsRef: RefObject<readonly string[]>;
  onFeatureClickRef: RefObject<MapFeatureClickHandler>;
  onClusterClickRef: RefObject<MapClusterClickHandler>;
  mapToolModeRef: RefObject<MapToolMode>;
};

/** Keeps map-listener inputs current without re-registering the listeners. */
export function useLatestMapValues({
  basemap,
  interactiveLayerIds,
  onFeatureClick,
  onClusterClick,
  mapToolMode,
}: {
  basemap: AvaMapConfig.Basemap;
  interactiveLayerIds: readonly string[];
  onFeatureClick: MapFeatureClickHandler;
  onClusterClick: MapClusterClickHandler;
  mapToolMode: MapToolMode;
}): LatestMapValues {
  const basemapRef = useRef(basemap);
  const interactiveLayerIdsRef = useRef(interactiveLayerIds);
  const onFeatureClickRef = useRef(onFeatureClick);
  const onClusterClickRef = useRef(onClusterClick);
  const mapToolModeRef = useRef(mapToolMode);
  useEffect(
    function syncLatestMapValues() {
      basemapRef.current = basemap;
      interactiveLayerIdsRef.current = interactiveLayerIds;
      onFeatureClickRef.current = onFeatureClick;
      onClusterClickRef.current = onClusterClick;
      mapToolModeRef.current = mapToolMode;
    },
    [basemap, interactiveLayerIds, mapToolMode, onClusterClick, onFeatureClick],
  );
  return {
    basemapRef,
    interactiveLayerIdsRef,
    onFeatureClickRef,
    onClusterClickRef,
    mapToolModeRef,
  };
}
