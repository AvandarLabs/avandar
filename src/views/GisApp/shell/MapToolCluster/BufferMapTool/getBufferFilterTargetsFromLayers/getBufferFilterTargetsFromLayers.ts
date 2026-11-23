import { propEq } from "@avandar/utils";
import { hasSpatialFilterCycle } from "$/models/AvaMap/AvaMapConfig/hasSpatialFilterCycle/hasSpatialFilterCycle";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/**
 * Point layers a buffer just added can filter without a dependency loop.
 * Read by `BufferFilterStep` for its "Filter another layer by this buffer"
 * picker. The buffer's own source is never offered, since filtering it by
 * its own buffer is a loop. Nothing is offered until the buffer is on the
 * map.
 */
export function getBufferFilterTargetsFromLayers(
  options: Readonly<{
    layers: readonly MapLayer.T[];
    bufferLayerId: MapLayer.Id;
  }>,
): MapLayer.T[] {
  const { layers, bufferLayerId } = options;
  if (!layers.some(propEq("id", bufferLayerId))) {
    return [];
  }
  return layers.filter((target) => {
    if (!MapLayer.isPointGeoBinding(target.geoBinding)) {
      return false;
    }
    const filteredLayers = layers.map((layer) => {
      return layer.id === target.id
        ? { ...layer, spatialFilter: { layerId: bufferLayerId } }
        : layer;
    });
    return !hasSpatialFilterCycle(filteredLayers, target.id);
  });
}
