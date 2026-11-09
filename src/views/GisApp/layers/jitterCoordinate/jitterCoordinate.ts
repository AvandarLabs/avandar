import { buildHmacSha256 } from "@/views/GisApp/layers/jitterCoordinate/buildHmacSha256";

const METERS_PER_DEGREE_LATITUDE = 111_320;

/**
 * Derives a stable 32-bit value from a point's identity, keyed by the map's
 * secret salt. Keying it means a reader who knows the public seed (layer id
 * and original coordinates) still cannot recompute the offset, so the exact
 * location cannot be recovered by subtracting it.
 */
function _buildKeyedSeedHash(salt: string, seed: string): number {
  const digest = buildHmacSha256({ key: salt, message: seed });
  return new DataView(digest.buffer).getUint32(0);
}

/**
 * Wraps a longitude into the valid `[-180, 180]` range, so a displacement
 * that crosses the antimeridian lands at the correct position on the other
 * side instead of producing an out-of-range value.
 */
function _wrapLongitude(longitude: number): number {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

/**
 * Clamps a latitude into the valid `[-90, 90]` range. A displacement large
 * enough to overshoot a pole has nowhere further to go, so it is capped at
 * the pole rather than producing an out-of-range value.
 */
function _clampLatitude(latitude: number): number {
  return Math.min(90, Math.max(-90, latitude));
}

/**
 * Displaces a coordinate by a stable pseudo-random offset inside
 * `radiusMeters`, so an approximate location can be shown without revealing
 * the exact one.
 *
 * The offset is a keyed hash of `seed` under `salt`, so repeated renders of
 * the same row do not make the point wander, yet the offset cannot be
 * recomputed by anyone who only sees the published seed.
 *
 * @param params The coordinate to displace and how far to displace it.
 * @param params.longitude The exact longitude, in degrees.
 * @param params.latitude The exact latitude, in degrees.
 * @param params.radiusMeters Largest displacement allowed; zero disables
 * jitter.
 * @param params.salt The map's secret jitter salt. It must never be
 * published alongside displaced points.
 * @param params.seed Stable per-point identity from `buildJitterSeed`: the
 * layer id and the point's original coordinates.
 * @returns The displaced coordinate, unchanged when `radiusMeters` is zero.
 */
export function jitterCoordinate({
  longitude,
  latitude,
  radiusMeters,
  salt,
  seed,
}: {
  longitude: number;
  latitude: number;
  radiusMeters: number;
  salt: string;
  seed: string;
}): { longitude: number; latitude: number } {
  if (radiusMeters <= 0) {
    return { longitude, latitude };
  }
  const seedHash = _buildKeyedSeedHash(salt, seed);
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
  // Near the poles a fixed east-west distance genuinely spans a huge number
  // of longitude degrees; that large delta is real geometry, not a bug. The
  // `1e-6` floor only guards against dividing by exactly zero at the pole.
  const metersPerDegreeLongitude =
    METERS_PER_DEGREE_LATITUDE * Math.max(Math.cos(latitudeRadians), 1e-6);
  const deltaLongitude =
    (distanceMeters * Math.cos(angleRadians)) / metersPerDegreeLongitude;

  return {
    longitude: _wrapLongitude(longitude + deltaLongitude),
    latitude: _clampLatitude(latitude + deltaLatitude),
  };
}
