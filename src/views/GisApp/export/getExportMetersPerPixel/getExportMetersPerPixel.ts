import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/** Meters around the equator, MapLibre's own Web Mercator transform value. */
const EARTH_CIRCUMFERENCE_METERS = 40_075_016.686;

/** Pixels spanning the whole world at zoom zero, MapLibre's own tile size. */
const WORLD_TILE_SIZE_PX = 512;

/**
 * Reproduces the ground resolution a live MapLibre camera would report at a
 * given center and zoom, using the same Web Mercator relationship MapLibre's
 * transform uses internally: circumference-at-latitude divided by world
 * size, where world size is `512 * 2^zoom` (MapLibre's own tile size times
 * the number of tiles spanning the world at that zoom).
 *
 * The export camera has no live map until capture succeeds, so this is the
 * only way to feed `MapScale.fromMetersPerPixel` a resolution before the
 * canvas exists. It intentionally computes only the *input* to that
 * function, never a second distance-or-bar calculation: printing a
 * confidently wrong scale is worse than printing none, so this projection
 * math is pinned against hand-computed reference values in this module's
 * test, not merely checked against itself.
 */
export function getExportMetersPerPixel(view: AvaMapConfig.ViewState): number {
  const latitudeRadians = (view.center[1] * Math.PI) / 180;
  const circumferenceAtLatitude =
    EARTH_CIRCUMFERENCE_METERS * Math.cos(latitudeRadians);
  const worldSizePx = WORLD_TILE_SIZE_PX * 2 ** view.zoom;
  return circumferenceAtLatitude / worldSizePx;
}
