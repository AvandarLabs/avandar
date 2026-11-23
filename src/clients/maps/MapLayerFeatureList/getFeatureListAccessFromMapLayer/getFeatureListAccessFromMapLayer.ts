import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapLayerFeatureListAccess } from "../MapLayerFeatureList.types";

/**
 * What a layer's feature list may show. Exact layers drawn from rows list
 * every row; jittered layers show only a count, since exact rows would undo
 * the protection jitter gives; aggregate-only layers and layers whose
 * features are not rows (boundary joins, bins, buffers) have no list. Use it
 * to decide whether to offer a feature list, for example in a layer menu.
 */
export function getFeatureListAccessFromMapLayer(
  layer: MapLayer.T,
): MapLayerFeatureListAccess {
  const bindingType = layer.geoBinding?.type;
  const isRowLayer =
    bindingType === "latLngColumns" || bindingType === "geometryColumn";
  if (layer.sensitivity.mode === "aggregateOnly" || !isRowLayer) {
    return "unavailable";
  }
  return layer.sensitivity.mode === "jitter" ? "countOnly" : "rows";
}
