export const PolarEpsg = { north: 32661, south: 32761 } as const;
export const UtmEpsgBase = { north: 32600, south: 32700 } as const;

/**
 * Derives the UTM or UPS EPSG code for a WGS84 centroid.
 *
 * Polar latitudes use UPS (north ≥ 84°, south ≤ -80°). Otherwise the UTM
 * zone is computed from longitude and the hemisphere from latitude sign.
 */
export function getUtmEpsgFromLongitudeLatitude(
  longitude: number,
  latitude: number,
): number {
  if (latitude >= 84) {
    return PolarEpsg.north;
  }
  if (latitude <= -80) {
    return PolarEpsg.south;
  }

  const zone = Math.min(
    60,
    Math.max(1, Math.floor((longitude + 180) / 6) + 1),
  );

  if (latitude >= 0) {
    return UtmEpsgBase.north + zone;
  }

  return UtmEpsgBase.south + zone;
}
