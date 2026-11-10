/** Decimal places a coordinate keeps in a seed: about one centimeter. */
const SEED_COORDINATE_DECIMALS = 7;

/**
 * Builds the public seed a displaced point is keyed by: its layer, the
 * displacement radius, and its own original coordinates, rounded so float
 * noise does not change it. Keying by the point rather than its row position
 * means the same real point gets the same offset on every publish, however
 * rows are added, removed, or reordered, so a reader cannot average saved
 * versions to find it. The radius is part of the seed because the offset is
 * a fixed bearing scaled by the radius: two publishes at different radii on
 * one bearing would let a reader solve for the exact point.
 *
 * @param params.layerId The layer the point is drawn on.
 * @param params.radiusMeters The layer's displacement radius.
 * @param params.longitude The point's original longitude.
 * @param params.latitude The point's original latitude.
 * @returns The seed to pass to `jitterCoordinate`.
 */
export function buildJitterSeed(
  params: Readonly<{
    layerId: string;
    radiusMeters: number;
    longitude: number;
    latitude: number;
  }>,
): string {
  const longitude = params.longitude.toFixed(SEED_COORDINATE_DECIMALS);
  const latitude = params.latitude.toFixed(SEED_COORDINATE_DECIMALS);
  return `${params.layerId}:${params.radiusMeters}:${longitude},${latitude}`;
}
