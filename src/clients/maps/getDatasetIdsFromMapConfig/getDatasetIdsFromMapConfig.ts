import { Model } from "@avandar/models";
import { isDefined } from "@avandar/utils";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

function _getSourceDatasetId(layer: MapLayer.T): Dataset.Id | undefined {
  const source = layer.source.dataSource;
  return source && Model.isOfModelType(source, "Dataset")
    ? source.id
    : undefined;
}

function _getBoundaryDatasetId(layer: MapLayer.T): Dataset.Id | undefined {
  const binding = layer.geoBinding;
  return binding?.type === "joinToBoundaries" ||
    binding?.type === "aggregatePointsToBoundaries"
    ? binding.boundary.datasetId
    : undefined;
}

/**
 * Every dataset a map's layers read: each layer's source and each boundary
 * set it joins to. A viewer missing any of them cannot draw the map.
 */
export function getDatasetIdsFromMapConfig(
  config: Readonly<AvaMapConfig.T>,
): Dataset.Id[] {
  return Array.from(
    new Set(
      config.layers.flatMap((layer) => {
        return [
          _getSourceDatasetId(layer),
          _getBoundaryDatasetId(layer),
        ].filter(isDefined);
      }),
    ),
  );
}
