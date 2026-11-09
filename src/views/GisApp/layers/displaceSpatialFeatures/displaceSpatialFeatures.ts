import { jitterCoordinate } from "@/views/GisApp/layers/jitterCoordinate/jitterCoordinate";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

type DisplaceSpatialFeaturesInput = {
  layer: MapLayer.T;
  sourceLayer: MapLayer.T;
  featureCollection: GeoJSON.FeatureCollection;
};

/** Displaces one position with the seed lat/lng layers use for a row. */
function _jitterPosition(
  options: Readonly<{
    position: GeoJSON.Position;
    radiusMeters: number;
    seed: string;
  }>,
): GeoJSON.Position {
  const [longitude = 0, latitude = 0] = options.position;
  const displaced = jitterCoordinate({
    longitude,
    latitude,
    radiusMeters: options.radiusMeters,
    seed: options.seed,
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
    seed: string;
    layerName: string;
  }>,
): GeoJSON.Geometry {
  const { geometry, radiusMeters, seed } = options;
  if (geometry.type === "Point") {
    return {
      type: "Point",
      coordinates: _jitterPosition({
        position: geometry.coordinates,
        radiusMeters,
        seed,
      }),
    };
  }
  if (geometry.type === "MultiPoint") {
    return {
      type: "MultiPoint",
      coordinates: geometry.coordinates.map((position, memberIndex) => {
        return _jitterPosition({
          position,
          radiusMeters,
          seed: `${seed}:${memberIndex}`,
        });
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
  // buffering a point layer would reveal the locations jitter hides.
  return (
    binding?.type === "bufferOfLayer" &&
    sourceLayer.geoBinding?.type === "geometryColumn"
  );
}

/**
 * Applies a layer's `jitter` sensitivity policy to the features a spatial
 * query returned, so a displaced layer never exposes exact positions to the
 * map, its popups, or the map tools that read the same features.
 *
 * Each point moves exactly as a lat/lng row at the same index does: the same
 * `jitterCoordinate` with the seed `${layerId}:${featureIndex}`. Members of a
 * multipoint add their own index to that seed so they do not move together.
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
 * @returns The displaced features, or the input itself when nothing moves.
 * @throws SensitivityViolationError when a `jitter` layer draws lines,
 * polygons, or buffers around points, none of which can be displaced.
 */
export function displaceSpatialFeatures({
  layer,
  sourceLayer,
  featureCollection,
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
    features: featureCollection.features.map((feature, featureIndex) => {
      return {
        ...feature,
        geometry: _jitterGeometry({
          geometry: feature.geometry,
          radiusMeters: sensitivity.radiusMeters,
          seed: `${layer.id}:${featureIndex}`,
          layerName: layer.name,
        }),
      };
    }),
  };
}
