/** A map view in WGS 84 degrees, used to prefer nearby results. */
export type GeocodeBiasBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

/** One address match, as the place tool shows it. */
export type GeocodeCandidate = {
  label: string;
  latitude: number;
  longitude: number;

  /** The provider's confidence, 0 to 1. */
  confidence: number;
};

/**
 * Looks up an address. The `geocode` route depends only on this, so the
 * provider (Geoapify today) can be swapped without a client release.
 */
export type GeocoderProvider = {
  search: (
    options: Readonly<{ text: string; biasBox: GeocodeBiasBox | undefined }>,
  ) => Promise<GeocodeCandidate[]>;
};
