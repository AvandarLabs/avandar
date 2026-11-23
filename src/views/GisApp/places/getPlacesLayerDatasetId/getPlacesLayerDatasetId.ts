import { Model } from "@avandar/models";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/**
 * The places dataset a layer reads, or `undefined` when the layer has no
 * dataset source or its dataset is not one of the places datasets.
 */
export function getPlacesLayerDatasetId(
  layer: MapLayer.T | undefined,
  placesDatasetIds: ReadonlySet<Dataset.Id>,
): Dataset.Id | undefined {
  const dataSource = layer?.source.dataSource;
  return dataSource &&
    Model.isOfModelType(dataSource, "Dataset") &&
    placesDatasetIds.has(dataSource.id)
    ? dataSource.id
    : undefined;
}
