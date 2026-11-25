import { propEq } from "@avandar/utils";
import { MapLayerData } from "@/views/GisApp/layers/useMapLayersData/MapLayerData";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/**
 * Name of the layer the listed layer's buffer is drawn around. It labels the
 * list's distance and nearest columns, so renaming it changes the result.
 */
function _getNearestSourceName(
  config: AvaMapConfig.T,
  layer: MapLayer.T,
): string | undefined {
  const filterLayer = layer.spatialFilter
    ? config.layers.find(propEq("id", layer.spatialFilter.layerId))
    : undefined;
  const binding = filterLayer?.geoBinding;
  if (binding?.type !== "bufferOfLayer") {
    return undefined;
  }
  return config.layers.find(propEq("id", binding.layerId))?.name;
}

/**
 * Cache key parts for a layer's feature list: what can change its rows,
 * columns, or count. That is the layer's own query, every layer its spatial
 * filter reads (including the buffer that measures distance and the layer
 * that buffer is drawn around), the popup columns it lists, and the map's
 * area and time window. Restyling, hiding, or adding another layer leaves the
 * key unchanged, so the list keeps its rows and sort. Used by
 * `useFeatureListQuery`.
 */
export function getFeatureListQueryKey(
  options: Readonly<{ config: AvaMapConfig.T; layer: MapLayer.T | undefined }>,
): unknown[] {
  const { config, layer } = options;
  if (!layer) {
    return [];
  }
  return [
    MapLayerData.getQueryKeyFromMapLayer(
      layer,
      undefined,
      { aoi: config.aoi, timeRange: config.timeRange },
      config.layers,
    ),
    layer.popup.columnIds,
    _getNearestSourceName(config, layer),
  ];
}
