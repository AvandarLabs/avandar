/**
 * UTM and UPS EPSG codes derived from a WGS84 centroid.
 *
 * Polar latitudes use UPS (north ≥ 84°, south ≤ -80°). Otherwise the UTM
 * zone is computed from longitude and the hemisphere from latitude sign.
 */
export const UtmEpsg = {
  /** UPS EPSG codes for polar latitudes. */
  polar: { north: 32661, south: 32761 } as const,
  /** UTM zone-0 bases added to the 1-60 zone number. */
  base: { north: 32600, south: 32700 } as const,

  /** EPSG code covering a WGS84 longitude/latitude. */
  fromLongitudeLatitude: (options: {
    longitude: number;
    latitude: number;
  }): number => {
    const { longitude, latitude } = options;
    if (latitude >= 84) {
      return UtmEpsg.polar.north;
    }
    if (latitude <= -80) {
      return UtmEpsg.polar.south;
    }

    const zone = Math.min(
      60,
      Math.max(1, Math.floor((longitude + 180) / 6) + 1),
    );

    if (latitude >= 0) {
      return UtmEpsg.base.north + zone;
    }

    return UtmEpsg.base.south + zone;
  },
};
