import { useCallback, useState } from "react";
import { AvaMap } from "$/models/AvaMap/AvaMap";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

const DEFAULT_MAP_NAME = "Untitled map";
const DEFAULT_LAYER_NAME = "Layer 1";

/** Holds the editable in-memory map and applies immutable layer updates. */
export function useGisMapState(): {
  avaMap: AvaMap.T;
  layer: MapLayer.T;
  updateLayer: (update: (current: MapLayer.T) => MapLayer.T) => void;
  updateBasemap: (basemap: AvaMap.Basemap) => void;
} {
  const [avaMap, setAvaMap] = useState(() => {
    const emptyMap = AvaMap.makeEmpty(DEFAULT_MAP_NAME);
    return {
      ...emptyMap,
      layers: [MapLayer.makeEmpty(DEFAULT_LAYER_NAME)],
    };
  });
  const updateLayer = useCallback(
    (update: (current: MapLayer.T) => MapLayer.T) => {
      setAvaMap((currentMap) => {
        const currentLayer = currentMap.layers[0]!;
        const updatedLayer = update(currentLayer);
        if (updatedLayer === currentLayer) {
          return currentMap;
        }
        return {
          ...currentMap,
          layers: [updatedLayer, ...currentMap.layers.slice(1)],
        };
      });
    },
    [],
  );
  const updateBasemap = useCallback((basemap: AvaMap.Basemap) => {
    setAvaMap((currentMap) => {
      return { ...currentMap, basemap };
    });
  }, []);
  return { avaMap, layer: avaMap.layers[0]!, updateLayer, updateBasemap };
}
