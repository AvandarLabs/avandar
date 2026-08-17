const WEB_MERCATOR_WORLD_METERS = 40_075_016.68557849;
const MAX_WEB_MERCATOR_LATITUDE = 85.051129;

/** Converts a screen-space geometry tolerance to Web Mercator meters. */
export function getSimplificationToleranceFromZoomBand(options: {
  zoomBand: number;
  centerLatitude: number;
  tolerancePixels: number;
}): number {
  const clampedZoomBand = Math.max(
    0,
    Math.min(24, Math.floor(options.zoomBand)),
  );
  const clampedLatitude = Math.max(
    -MAX_WEB_MERCATOR_LATITUDE,
    Math.min(MAX_WEB_MERCATOR_LATITUDE, options.centerLatitude),
  );
  const latitudeScale = Math.cos((clampedLatitude * Math.PI) / 180);
  return (
    (WEB_MERCATOR_WORLD_METERS / (512 * 2 ** clampedZoomBand)) *
    latitudeScale *
    options.tolerancePixels
  );
}
