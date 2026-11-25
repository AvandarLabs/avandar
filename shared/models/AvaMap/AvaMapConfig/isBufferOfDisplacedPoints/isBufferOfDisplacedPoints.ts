import { makeIdLookupMap } from "@avandar/utils";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";

/**
 * Returns whether `layerId` is a buffer whose chain of `bufferOfLayer` links
 * ends at a `jitter` layer drawn from exact point positions (a geometry
 * column or latitude and longitude columns).
 *
 * Rings centered on those exact points would reveal the locations jitter
 * hides, to a viewer or to any probe layer filtered by them. A cyclic or
 * broken chain returns false: other checks reject those.
 */
export function isBufferOfDisplacedPoints(
  layers: readonly MapLayer.T[],
  layerId: MapLayer.Id,
): boolean {
  const byId = makeIdLookupMap(layers);
  const seen = new Set<MapLayer.Id>();
  let current = byId.get(layerId);
  if (current?.geoBinding?.type !== "bufferOfLayer") {
    return false;
  }
  while (current?.geoBinding?.type === "bufferOfLayer") {
    if (seen.has(current.id)) {
      return false;
    }
    seen.add(current.id);
    current = byId.get(current.geoBinding.layerId);
  }
  const bindingType = current?.geoBinding?.type;
  return (
    current?.sensitivity.mode === "jitter" &&
    (bindingType === "geometryColumn" || bindingType === "latLngColumns")
  );
}
