import { Model } from "@avandar/models";
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
    const dataSource = layer.source.dataSource;
    return dataSource &&
      Model.isOfModelType(dataSource, "Dataset") &&
      options.placesDatasetIds.has(dataSource.id)
      ? [dataSource.id]
      : [];
  });
  return [...new Set(datasetIds)];
}
