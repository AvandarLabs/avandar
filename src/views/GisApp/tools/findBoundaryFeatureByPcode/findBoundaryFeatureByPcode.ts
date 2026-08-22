import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

import { MapLayerSpatialFeatureProperties } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants";

function _isBoundaryLayer(layer: MapLayer.T): boolean {
  const bindingType = layer.geoBinding?.type;
  return (
    bindingType === "joinToBoundaries" ||
    bindingType === "aggregatePointsToBoundaries"
  );
}

function _featureHasPcode(feature: GeoJSON.Feature, code: string): boolean {
  const properties = feature.properties;
  if (!properties) {
    return false;
  }
  return properties[MapLayerSpatialFeatureProperties.boundaryKey] === code;
}

/**
 * Returns the first loaded boundary feature whose key matches `code`
 * exactly. Looks only at `joinToBoundaries` and
 * `aggregatePointsToBoundaries` layers.
 */
export function findBoundaryFeatureByPcode(options: {
  layers: readonly MapLayer.T[];
  featureCollections: ReadonlyMap<MapLayer.Id, GeoJSON.FeatureCollection>;
  code: string;
}): GeoJSON.Feature | undefined {
  const { layers, featureCollections, code } = options;
  return layers
    .filter(_isBoundaryLayer)
    .flatMap((layer) => {
      return featureCollections.get(layer.id)?.features ?? [];
    })
    .find((feature) => {
      return _featureHasPcode(feature, code);
    });
}
