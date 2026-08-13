/** South-west then north-east corner, each `[longitude, latitude]`. */
export type MapBounds = readonly [
  southWest: readonly [number, number],
  northEast: readonly [number, number],
];

type MutableBox = {
  minLongitude: number;
  minLatitude: number;
  maxLongitude: number;
  maxLatitude: number;
  hasCoordinate: boolean;
};

/**
 * Walks an arbitrarily nested GeoJSON coordinate array, extending `box` with
 * every `[longitude, latitude]` pair it finds. Handles Point through
 * MultiPolygon without needing a case per geometry type.
 */
function _extendBoxWithCoordinates(
  box: MutableBox,
  coordinates: unknown,
): void {
  if (!Array.isArray(coordinates)) {
    return;
  }
  const [first, second] = coordinates;
  if (typeof first === "number" && typeof second === "number") {
    box.minLongitude = Math.min(box.minLongitude, first);
    box.maxLongitude = Math.max(box.maxLongitude, first);
    box.minLatitude = Math.min(box.minLatitude, second);
    box.maxLatitude = Math.max(box.maxLatitude, second);
    box.hasCoordinate = true;
    return;
  }
  coordinates.forEach((nested) => {
    _extendBoxWithCoordinates(box, nested);
  });
}

function _extendBoxWithGeometry(
  box: MutableBox,
  geometry: GeoJSON.Geometry,
): void {
  if (geometry.type === "GeometryCollection") {
    geometry.geometries.forEach((nested) => {
      _extendBoxWithGeometry(box, nested);
    });
    return;
  }
  _extendBoxWithCoordinates(box, geometry.coordinates);
}

/**
 * Computes the bounding box of a feature collection, for every geometry type.
 * @returns The bounds, or `undefined` when the collection holds no usable
 * coordinate (so callers can leave the camera where it is instead of flying
 * to an infinite box).
 */
export function computeBounds(
  featureCollection: GeoJSON.FeatureCollection,
): MapBounds | undefined {
  const box: MutableBox = {
    minLongitude: Infinity,
    minLatitude: Infinity,
    maxLongitude: -Infinity,
    maxLatitude: -Infinity,
    hasCoordinate: false,
  };

  featureCollection.features.forEach((feature) => {
    if (!feature.geometry) {
      return;
    }
    _extendBoxWithGeometry(box, feature.geometry);
  });

  if (!box.hasCoordinate) {
    return undefined;
  }
  return [
    [box.minLongitude, box.minLatitude],
    [box.maxLongitude, box.maxLatitude],
  ];
}
