import { hasSpatialFilterCycle } from "$/models/AvaMap/AvaMapConfig/hasSpatialFilterCycle/hasSpatialFilterCycle.ts";
import { isBufferOfDisplacedPoints } from "$/models/AvaMap/AvaMapConfig/isBufferOfDisplacedPoints/isBufferOfDisplacedPoints.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";

/**
 * The layers that `layerId` may be spatially filtered by: every other layer
 * that outputs polygons and does not depend on `layerId`. Use it to fill a
 * "keep features inside this layer" picker, for example in a layer
 * inspector. A buffer of a displaced (`jitter`) point layer is never offered:
 * its rings are centered on the exact points.
 */
export function getSpatialFilterCandidatesFromLayers(
  options: Readonly<{ layers: readonly MapLayer.T[]; layerId: MapLayer.Id }>,
): MapLayer.T[] {
  const { layers, layerId } = options;
  return layers.filter((candidate) => {
    if (candidate.id === layerId) {
      return false;
    }
    if (!MapLayer.isAreaGeoBinding(candidate.geoBinding)) {
      return false;
    }
    if (isBufferOfDisplacedPoints(layers, candidate.id)) {
      return false;
    }
    const filteredLayers = layers.map((layer) => {
      return layer.id === layerId
        ? { ...layer, spatialFilter: { layerId: candidate.id } }
        : layer;
    });
    return !hasSpatialFilterCycle(filteredLayers, layerId);
  });
}
