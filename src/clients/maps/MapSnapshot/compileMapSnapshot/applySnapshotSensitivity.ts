import { match } from "ts-pattern";
import { isBufferOfDisplacedPoints } from "$/models/AvaMap/AvaMapConfig/isBufferOfDisplacedPoints/isBufferOfDisplacedPoints";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

const AREA_GEOMETRY_TYPES: ReadonlySet<GeoJSON.Geometry["type"]> = new Set([
  "Polygon",
  "MultiPolygon",
]);

const POINT_GEOMETRY_TYPES: ReadonlySet<GeoJSON.Geometry["type"]> = new Set([
  "Point",
  "MultiPoint",
]);

/** True when any feature's geometry type is outside `allowedTypes`. */
function _hasGeometryOutside(
  featureCollection: GeoJSON.FeatureCollection,
  allowedTypes: ReadonlySet<GeoJSON.Geometry["type"]>,
): boolean {
  return featureCollection.features.some((feature) => {
    return !allowedTypes.has(feature.geometry.type);
  });
}

/**
 * Re-checks a layer's sensitivity policy on the features about to be
 * published, and throws rather than let anything through that the policy
 * forbids.
 *
 * It never moves a point itself. Displacement already happened in the query
 * and render path the live map shares (`runMapLayerQuery` displaces a
 * geometry layer's points, `makeFeatureCollectionFromRows` a lat/lng
 * layer's), and displacing those features again would publish them up to
 * twice the layer's radius away. What it checks instead:
 * - `jitter`: only points or multipoints, and never rings drawn around
 *   displaced points, which would stay centered on the exact positions.
 * - `aggregateOnly`: only polygons or multipolygons.
 *
 * @param options.layer The layer being published, carrying its policy.
 * @param options.stack Every layer of the map, to resolve buffer sources.
 * @param options.featureCollection The features the layer draws.
 * @returns The same features, unchanged.
 * @throws SensitivityViolationError when a feature breaks the policy.
 */
export function applySnapshotSensitivity(
  options: Readonly<{
    layer: MapLayer.T;
    stack: readonly MapLayer.T[];
    featureCollection: GeoJSON.FeatureCollection;
  }>,
): GeoJSON.FeatureCollection {
  const { layer, stack, featureCollection } = options;
  return match(layer.sensitivity)
    .with({ mode: "exact" }, () => {
      return featureCollection;
    })
    .with({ mode: "jitter" }, () => {
      if (
        isBufferOfDisplacedPoints(stack, layer.id) ||
        _hasGeometryOutside(featureCollection, POINT_GEOMETRY_TYPES)
      ) {
        throw new SensitivityViolationError("jitterRequiresPoints", layer.name);
      }
      return featureCollection;
    })
    .with({ mode: "aggregateOnly" }, () => {
      if (_hasGeometryOutside(featureCollection, AREA_GEOMETRY_TYPES)) {
        throw new SensitivityViolationError("aggregateOnly", layer.name);
      }
      return featureCollection;
    })
    .exhaustive();
}
