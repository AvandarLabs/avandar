import { makeIdLookupMap } from "@avandar/utils";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";

/**
 * Returns whether following `bufferOfLayer` links from `startLayerId`
 * visits a layer twice.
 */
export function hasBufferCycle(
  layers: readonly MapLayer.T[],
  startLayerId: MapLayer.Id,
): boolean {
  const byId = makeIdLookupMap(layers);
  const seen = new Set<MapLayer.Id>();
  let currentId: MapLayer.Id | undefined = startLayerId;
  while (currentId) {
    if (seen.has(currentId)) {
      return true;
    }
    seen.add(currentId);
    const current = byId.get(currentId);
    currentId =
      current?.geoBinding?.type === "bufferOfLayer"
        ? current.geoBinding.layerId
        : undefined;
  }
  return false;
}
