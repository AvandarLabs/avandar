import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Internal parsed-geometry column used across compiled spatial CTEs. */
export const GEOMETRY_COLUMN = "__avandar_geometry";

/** Internal geometry-family column used across compiled spatial CTEs. */
export const FAMILY_COLUMN = "__avandar_geometry_family";

/**
 * Screen-space tolerance used to simplify grid-cell outlines.
 *
 * Cell size is fixed in meters, so a bin binding persists no simplification of
 * its own; only the drawn outline follows the zoom band.
 */
export const GRID_CELL_SIMPLIFICATION: MapLayer.GeometrySimplification = {
  tolerancePixels: 0.75,
};
