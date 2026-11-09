import { getPlacesLayerDatasetId } from "@/views/GisApp/places/getPlacesLayerDatasetId/getPlacesLayerDatasetId";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/**
 * The places datasets a map already shows, each once, in layer order. The
 * first is where the place tool saves a new place; all of them get a fresh
 * read when the map opens.
 */
export function getPlacesLayerDatasetIds(
  options: Readonly<{
    layers: readonly MapLayer.T[];
    placesDatasetIds: ReadonlySet<Dataset.Id>;
  }>,
): Dataset.Id[] {
  const datasetIds = options.layers.flatMap((layer) => {
    const datasetId = getPlacesLayerDatasetId(layer, options.placesDatasetIds);
    return datasetId ? [datasetId] : [];
  });
  return [...new Set(datasetIds)];
}
