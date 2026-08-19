import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { makeSourceAoiPredicateSql } from "../AoiPredicateSqlHelpers/AoiPredicateSqlHelpers";
import { applyTimePredicateToSourceSql } from "../applyTimePredicateToSourceSql/applyTimePredicateToSourceSql";
import type { MapOverlay } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

type CompileLatLngOverlayOptions = {
  sourceSql: string;
  layer: MapLayer.T;
  overlay: MapOverlay;
  latitudeColumnName: string;
  longitudeColumnName: string;
  timeColumnName: string | undefined;
};

/**
 * Returns lat/lng source SQL with the map clock and AOI applied.
 *
 * @returns Undefined when the overlay does not change the source SQL.
 */
export function compileLatLngOverlaySql(
  options: Readonly<CompileLatLngOverlayOptions>,
): string | undefined {
  const wrappedSql = applyTimePredicateToSourceSql({
    sourceSql: options.sourceSql,
    timeColumnName: options.timeColumnName,
    timeRange: options.overlay.timeRange,
  });
  const aoi = options.layer.applyAoiFilter ? options.overlay.aoi : undefined;
  if (!aoi) {
    return wrappedSql === options.sourceSql ? undefined : wrappedSql;
  }
  const pointSql = `ST_Point(${quoteSqlIdentifier(options.longitudeColumnName)}, ${quoteSqlIdentifier(options.latitudeColumnName)})`;
  return `SELECT * FROM (${wrappedSql}) AS overlay_source WHERE ${makeSourceAoiPredicateSql(pointSql, aoi)}`;
}
