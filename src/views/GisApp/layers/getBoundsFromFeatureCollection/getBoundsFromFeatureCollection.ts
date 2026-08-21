/** South-west then north-east corner, each `[longitude, latitude]`. */
export type MapBounds = [
  southWest: [number, number],
  northEast: [number, number],
];

type MutableBox = {
  minLongitude: number;
  minLatitude: number;
  maxLongitude: number;
  maxLatitude: number;
  hasCoordinate: boolean;
};

/**
 * True when a pair is a coordinate a WGS 84 camera can fly to. Geometry that
 * has not been reprojected yet, such as a metre-based projection the author
 * has not declared a source CRS for, carries values far outside this range.
 */
function _isWgs84Coordinate(longitude: number, latitude: number): boolean {
  return (
    longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90
  );
}

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
    if (!_isWgs84Coordinate(first, second)) {
      return;
    }
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
 * Coordinates outside the WGS 84 range are skipped: `fitBounds` throws on
 * them, which would take down the whole map.
 * @returns The bounds, or `undefined` when the collection holds no usable
 * coordinate (so callers can leave the camera where it is instead of flying
 * to an infinite box).
 */
export function getBoundsFromFeatureCollection(
  featureCollection: Readonly<
    GeoJSON.FeatureCollection<GeoJSON.Geometry | null>
  >,
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
