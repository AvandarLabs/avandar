import { buildJitterSeed } from "@/views/GisApp/layers/buildJitterSeed/buildJitterSeed";
import { jitterCoordinate } from "@/views/GisApp/layers/jitterCoordinate/jitterCoordinate";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

type DisplaceSpatialFeaturesInput = {
  layer: MapLayer.T;
  sourceLayer: MapLayer.T;
  featureCollection: GeoJSON.FeatureCollection;
  jitterSalt: string;
};

/**
 * Displaces one position with the seed a lat/lng row at the same coordinates
 * uses, so a point moves the same way whichever binding draws it.
 */
function _jitterPosition(
  options: Readonly<{
    position: GeoJSON.Position;
    radiusMeters: number;
    salt: string;
    layerId: string;
  }>,
): GeoJSON.Position {
  const [longitude = 0, latitude = 0] = options.position;
  const displaced = jitterCoordinate({
    longitude,
    latitude,
    radiusMeters: options.radiusMeters,
    salt: options.salt,
    seed: buildJitterSeed({ layerId: options.layerId, longitude, latitude }),
  });
  return [displaced.longitude, displaced.latitude];
}

/**
 * Displaces a point or every member of a multipoint. Any other geometry type
 * throws, so a feature that cannot be displaced is never drawn exactly.
 */
function _jitterGeometry(
  options: Readonly<{
    geometry: GeoJSON.Geometry;
    radiusMeters: number;
    salt: string;
    layerId: string;
    layerName: string;
  }>,
): GeoJSON.Geometry {
  const { geometry, radiusMeters, salt, layerId } = options;
  if (geometry.type === "Point") {
    return {
      type: "Point",
      coordinates: _jitterPosition({
        position: geometry.coordinates,
        radiusMeters,
        salt,
        layerId,
      }),
    };
  }
  if (geometry.type === "MultiPoint") {
    return {
      type: "MultiPoint",
      coordinates: geometry.coordinates.map((position) => {
        return _jitterPosition({ position, radiusMeters, salt, layerId });
      }),
    };
  }
  throw new SensitivityViolationError(
    "jitterRequiresPoints",
    options.layerName,
  );
}

/** True when the layer draws geometry that jitter cannot displace. */
function _isUndisplaceable(
  layer: MapLayer.T,
  sourceLayer: MapLayer.T,
): boolean {
  const binding = layer.geoBinding;
  if (binding?.type === "geometryColumn") {
    return binding.family !== "point";
  }
  // A buffer ring stays centered on the exact point it was drawn around, so
  // buffering a point layer would reveal the locations jitter hides. That
  // holds for geometry-column and latitude and longitude sources alike.
  const sourceBindingType = sourceLayer.geoBinding?.type;
  return (
    binding?.type === "bufferOfLayer" &&
    (sourceBindingType === "geometryColumn" ||
      sourceBindingType === "latLngColumns")
  );
}

/**
 * Applies a layer's `jitter` sensitivity policy to the features a spatial
 * query returned, so a displaced layer never exposes exact positions to the
 * map, its popups, or the map tools that read the same features.
 *
 * Each point moves exactly as a lat/lng row at the same coordinates does: the
 * same `jitterCoordinate` keyed by the map's secret salt, seeded by the layer
 * and the point's own original coordinates (`buildJitterSeed`). Each member
 * of a multipoint is seeded by its own coordinates, so members at different
 * places move independently.
 *
 * Aggregated bindings (boundary joins, point aggregation, grid bins) are
 * returned unchanged: they draw areas and counts, never individual points.
 *
 * @param params The layer, the layer its geometry is derived from, and the
 * features to displace.
 * @param params.layer The layer being drawn, carrying the sensitivity policy.
 * @param params.sourceLayer The layer a buffer is drawn around, or `layer`
 * itself for every other binding.
 * @param params.featureCollection The parsed spatial query features.
 * @param params.jitterSalt The map's secret jitter salt.
 * @returns The displaced features, or the input itself when nothing moves.
 * @throws SensitivityViolationError when a `jitter` layer draws lines,
 * polygons, or buffers around points, none of which can be displaced.
 */
export function displaceSpatialFeatures({
  layer,
  sourceLayer,
  featureCollection,
  jitterSalt,
}: Readonly<DisplaceSpatialFeaturesInput>): GeoJSON.FeatureCollection {
  const { sensitivity } = layer;
  if (sensitivity.mode !== "jitter") {
    return featureCollection;
  }
  if (_isUndisplaceable(layer, sourceLayer)) {
    throw new SensitivityViolationError("jitterRequiresPoints", layer.name);
  }
  if (layer.geoBinding?.type !== "geometryColumn") {
    return featureCollection;
  }
  return {
    ...featureCollection,
    features: featureCollection.features.map((feature) => {
      return {
        ...feature,
        geometry: _jitterGeometry({
          geometry: feature.geometry,
          radiusMeters: sensitivity.radiusMeters,
          salt: jitterSalt,
          layerId: layer.id,
          layerName: layer.name,
        }),
      };
    }),
  };
}
