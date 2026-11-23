import { useCallback, useState } from "react";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Which layer's feature list drawer is open, and how to open or close it. */
export type GisAppFeatureList = {
  featureListLayerId: MapLayer.Id | undefined;
  openFeatureList: (layerId: MapLayer.Id) => void;
  closeFeatureList: () => void;
};

/**
 * Holds which layer's feature list drawer is open for the GIS shell. The
 * layer menu and the buffer tool open it; the drawer's close button shuts
 * it.
 */
export function useGisAppFeatureList(): GisAppFeatureList {
  const [featureListLayerId, setFeatureListLayerId] = useState<MapLayer.Id>();
  const openFeatureList = useCallback((layerId: MapLayer.Id) => {
    setFeatureListLayerId(layerId);
  }, []);
  const closeFeatureList = useCallback(() => {
    setFeatureListLayerId(undefined);
  }, []);
  return { featureListLayerId, openFeatureList, closeFeatureList };
}
