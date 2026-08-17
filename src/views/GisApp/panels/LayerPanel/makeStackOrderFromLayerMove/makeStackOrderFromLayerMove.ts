import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Returns the panel order with one layer moved by one position. */
export function makeStackOrderFromLayerMove({
  orderedLayerIds,
  layerId,
  offset,
}: {
  orderedLayerIds: readonly MapLayer.Id[];
  layerId: MapLayer.Id;
  offset: -1 | 1;
}): readonly MapLayer.Id[] {
  const fromIndex = orderedLayerIds.indexOf(layerId);
  const targetIndex = fromIndex + offset;
  if (
    fromIndex === -1 ||
    targetIndex < 0 ||
    targetIndex >= orderedLayerIds.length
  ) {
    return orderedLayerIds;
  }

  const movedOrderedLayerIds = [...orderedLayerIds];
  movedOrderedLayerIds.splice(fromIndex, 1);
  movedOrderedLayerIds.splice(targetIndex, 0, layerId);
  return movedOrderedLayerIds;
}
