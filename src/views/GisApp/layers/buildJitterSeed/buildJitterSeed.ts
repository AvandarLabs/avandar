/** Decimal places a coordinate keeps in a seed: about one centimeter. */
const SEED_COORDINATE_DECIMALS = 7;

/**
 * Builds the public seed a displaced point is keyed by: its layer and its own
 * original coordinates, rounded so float noise does not change it. Keying by
 * the point rather than its row position means the same real point gets the
 * same offset on every publish, however rows are added, removed, or
 * reordered, so a reader cannot average saved versions to find it.
 *
 * @param params.layerId The layer the point is drawn on.
 * @param params.longitude The point's original longitude.
 * @param params.latitude The point's original latitude.
 * @returns The seed to pass to `jitterCoordinate`.
 */
export function buildJitterSeed(
  params: Readonly<{ layerId: string; longitude: number; latitude: number }>,
): string {
  const longitude = params.longitude.toFixed(SEED_COORDINATE_DECIMALS);
  const latitude = params.latitude.toFixed(SEED_COORDINATE_DECIMALS);
  return `${params.layerId}:${longitude},${latitude}`;
}
