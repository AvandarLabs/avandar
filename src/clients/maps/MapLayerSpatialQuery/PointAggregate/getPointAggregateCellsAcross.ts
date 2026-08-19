import {
  POINT_AGGREGATE_CELL_SIZE_PX,
  POINT_AGGREGATE_TILE_SIZE_PX,
} from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.constants";

/** MapLibre's zoom ceiling, and so the finest grid worth asking for. */
const MAX_ZOOM_BAND = 24;

/**
 * How many aggregation cells span the world at one zoom level.
 *
 * This is what makes SQL-side aggregation behave like clustering rather than
 * like a fixed grid: cells are defined in screen pixels, so the same cell size
 * subdivides further at every zoom level, and the aggregation converges on the
 * individual source coordinates as the user zooms in.
 *
 * @param options.zoomBand The map's integer zoom, clamped to `0..24`. A
 * fractional zoom must be floored by the caller so a pan-and-nudge does not
 * change the grid, and with it every cached cell.
 * @param options.cellSizePx Cell size in CSS pixels. Defaults to
 * {@link POINT_AGGREGATE_CELL_SIZE_PX}.
 * @returns Cell count across the world, always at least 1.
 */
export function getPointAggregateCellsAcross(
  options: Readonly<{ zoomBand: number; cellSizePx?: number }>,
): number {
  const zoomBand = Math.min(MAX_ZOOM_BAND, Math.max(0, options.zoomBand));
  const cellSizePx = options.cellSizePx ?? POINT_AGGREGATE_CELL_SIZE_PX;
  const worldWidthPx = POINT_AGGREGATE_TILE_SIZE_PX * 2 ** zoomBand;
  return Math.max(1, Math.ceil(worldWidthPx / cellSizePx));
}
