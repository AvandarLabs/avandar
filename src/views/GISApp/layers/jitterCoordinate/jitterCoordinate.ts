const METERS_PER_DEGREE_LATITUDE = 111_320;

/**
 * Hashes a string into a 32-bit unsigned integer (FNV-1a). Used to derive a
 * stable pseudo-random displacement from a row's identity, so a jittered
 * point lands in the same place on every repaint.
 */
function buildSeedHash(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * Displaces a coordinate by a stable pseudo-random offset inside
 * `radiusMeters`, so an approximate location can be shown without revealing
 * the exact one.
 *
 * The offset is a function of `seed` alone, so repeated renders of the same
 * row do not make the point wander.
 *
 * @param params.seed Stable per-row identity, for example
 * `${layerId}:${rowIndex}`.
 * @returns The displaced coordinate, unchanged when `radiusMeters` is zero.
 */
export function jitterCoordinate({
  longitude,
  latitude,
  radiusMeters,
  seed,
}: {
  longitude: number;
  latitude: number;
  radiusMeters: number;
  seed: string;
}): { longitude: number; latitude: number } {
  if (radiusMeters <= 0) {
    return { longitude, latitude };
  }
  const seedHash = buildSeedHash(seed);
  // Split the hash into two independent unit fractions: one for the bearing,
  // one for the radius. Square-rooting the radius fraction spreads points
  // uniformly over the disc instead of clustering them at the center.
  const angleFraction = (seedHash & 0xffff) / 0x10000;
  const radiusFraction = ((seedHash >>> 16) & 0xffff) / 0x10000;
  const angleRadians = angleFraction * 2 * Math.PI;
  const distanceMeters = Math.sqrt(radiusFraction) * radiusMeters;

  const deltaLatitude =
    (distanceMeters * Math.sin(angleRadians)) / METERS_PER_DEGREE_LATITUDE;
  const latitudeRadians = (latitude * Math.PI) / 180;
  const metersPerDegreeLongitude =
    METERS_PER_DEGREE_LATITUDE * Math.max(Math.cos(latitudeRadians), 1e-6);
  const deltaLongitude =
    (distanceMeters * Math.cos(angleRadians)) / metersPerDegreeLongitude;

  return {
    longitude: longitude + deltaLongitude,
    latitude: latitude + deltaLatitude,
  };
}
