import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { makeSourceAoiPredicateSql } from "../AoiPredicateSqlHelpers/AoiPredicateSqlHelpers";
import { applyTimePredicateToSourceSql } from "../applyTimePredicateToSourceSql/applyTimePredicateToSourceSql";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapOverlay } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";

type CompileLatLngOverlayOptions = {
  sourceSql: string;
  layer: MapLayer.T;
  overlay: MapOverlay;
  latitudeColumnName: string;
  longitudeColumnName: string;
  timeColumnName: string | undefined;

  /** Declared type of the time column, which decides how it is compared. */
  timeColumnDataType?: string;
};

/**
 * Returns lat/lng source SQL with the map clock and AOI applied.
 *
 * Always returns real SQL, even when neither filter changes the source: a
 * lat/lng map layer must never pass `undefined` raw SQL downstream, since
 * that falls back to structured-query execution, where a large dataset with
 * no filter is silently capped at 100 rows.
 */
export function compileLatLngOverlaySql(
  options: Readonly<CompileLatLngOverlayOptions>,
): string {
  const wrappedSql = applyTimePredicateToSourceSql({
    sourceSql: options.sourceSql,
    timeColumnName: options.timeColumnName,
    timeRange: options.overlay.timeRange,
    timeColumnDataType: options.timeColumnDataType,
  });
  const aoi = options.layer.applyAoiFilter ? options.overlay.aoi : undefined;
  if (!aoi) {
    return wrappedSql;
  }
  const pointSql = `ST_Point(${quoteSqlIdentifier(options.longitudeColumnName)}, ${quoteSqlIdentifier(options.latitudeColumnName)})`;
  return `SELECT * FROM (${wrappedSql}) AS overlay_source WHERE ${makeSourceAoiPredicateSql(pointSql, aoi)}`;
}
