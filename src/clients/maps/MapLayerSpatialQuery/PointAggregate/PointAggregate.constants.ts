/**
 * Tile size MapLibre renders vector tiles at, in CSS pixels.
 *
 * Grid cells are sized in screen pixels, so the world's pixel width at a zoom
 * level (`POINT_AGGREGATE_TILE_SIZE_PX * 2 ** zoom`) is what turns a pixel cell
 * size into a count of cells across the world.
 */
export const POINT_AGGREGATE_TILE_SIZE_PX = 512;

/**
 * On-screen size of one aggregation cell, in CSS pixels.
 *
 * Matches `MapLayer.defaultClusterRadiusPx` closely enough that a SQL-side
 * aggregated bubble covers about as much screen as a MapLibre-side cluster
 * would, so a layer does not visibly regroup when it crosses
 * {@link POINT_AGGREGATE_ROW_THRESHOLD}.
 */
export const POINT_AGGREGATE_CELL_SIZE_PX = 50;

/**
 * Source rows above which a point layer aggregates in SQL rather than being
 * converted row-by-row in the browser.
 *
 * Below this, the browser converts every row and MapLibre's own clustering
 * groups them, which is cheap and keeps every source row available for popups
 * and cluster expansion. Above it, converting each row costs roughly half a
 * kilobyte of heap as a plain object plus another kilobyte as a GeoJSON
 * feature, so a few million rows exhausts the tab's heap before MapLibre is
 * ever handed the data. Aggregating in DuckDB instead keeps the browser's cost
 * proportional to what is on screen rather than to the size of the dataset.
 */
export const POINT_AGGREGATE_ROW_THRESHOLD = 10_000;

/**
 * Hard ceiling on how many aggregated rows may reach the browser.
 *
 * A zoom-sized grid already bounds output for most data, but a layer with
 * millions of distinct coordinates viewed at high zoom can still produce a cell
 * per coordinate. When that happens the grid is coarsened until the cell count
 * fits under this ceiling, which aggregates more rows together; it never drops
 * a row, so the layer stays complete at every zoom.
 */
export const POINT_AGGREGATE_MAX_CELLS = 20_000;

/**
 * Latitude beyond which Web Mercator cannot project a point.
 *
 * Used to clamp the latitude fed to the projection so a row at or beyond the
 * pole still lands in the outermost cell row instead of producing a
 * non-finite cell index. The coordinate reported for the cell remains the true
 * mean of its rows, so clamping affects grouping only, never geometry.
 */
export const WEB_MERCATOR_MAX_LATITUDE = 85.05112878;

/**
 * Feature properties an aggregated point layer carries.
 *
 * Deliberately the same names MapLibre's own clustering writes, so one set of
 * cluster paint layers renders a SQL-aggregated source and a MapLibre-clustered
 * source identically. `abbreviated` is computed in SQL for the same reason:
 * MapLibre derives it for its own clusters, and a style expression cannot call
 * a JavaScript formatter.
 */
export const PointAggregateProperties = {
  pointCount: "point_count",
  abbreviated: "point_count_abbreviated",
} as const;
