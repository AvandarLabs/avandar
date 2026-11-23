import { makeIdLookupMap } from "@avandar/utils";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";

/** Layers a layer reads from: its buffer source and its spatial filter. */
function _getDependencyIds(layer: MapLayer.T): MapLayer.Id[] {
  const bufferSourceIds =
    layer.geoBinding?.type === "bufferOfLayer"
      ? [layer.geoBinding.layerId]
      : [];
  const filterLayerIds = layer.spatialFilter
    ? [layer.spatialFilter.layerId]
    : [];
  return [...bufferSourceIds, ...filterLayerIds];
}

/**
 * Returns whether following buffer sources and spatial filters from
 * `startLayerId` leads back to it. Use it to refuse a spatial filter that
 * would make a layer depend on itself, for example sites filtered by their
 * own buffer. Missing layers end a path rather than count as a cycle.
 */
export function hasSpatialFilterCycle(
  layers: readonly MapLayer.T[],
  startLayerId: MapLayer.Id,
): boolean {
  const byId = makeIdLookupMap(layers);
  const startLayer = byId.get(startLayerId);
  const pendingIds = startLayer ? _getDependencyIds(startLayer) : [];
  const visitedIds = new Set<MapLayer.Id>();
  for (
    let currentId = pendingIds.pop();
    currentId !== undefined;
    currentId = pendingIds.pop()
  ) {
    if (currentId === startLayerId) {
      return true;
    }
    const current = byId.get(currentId);
    if (current && !visitedIds.has(currentId)) {
      visitedIds.add(currentId);
      pendingIds.push(..._getDependencyIds(current));
    }
  }
  return false;
}
