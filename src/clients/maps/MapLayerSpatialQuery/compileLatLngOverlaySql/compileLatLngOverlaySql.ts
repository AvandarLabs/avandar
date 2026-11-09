import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { makeSourceAoiPredicateSql } from "../AoiPredicateSqlHelpers/AoiPredicateSqlHelpers";
import { applyTimePredicateToSourceSql } from "../applyTimePredicateToSourceSql/applyTimePredicateToSourceSql";
import {
  makeFeaturesCteSqlFromFeatureSource,
  makeSpatialFilterPredicateSql,
} from "../FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";
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

  /** Envelope SQL of the layer's spatial filter layer, when it has one. */
  spatialFilterEnvelopeSql: string | undefined;
};

/** The WHERE predicates the AOI and the spatial filter add to point rows. */
function _getPointPredicates(
  options: Readonly<CompileLatLngOverlayOptions>,
  pointSql: string,
): string[] {
  const aoi = options.layer.applyAoiFilter ? options.overlay.aoi : undefined;
  return [
    ...(aoi ? [makeSourceAoiPredicateSql(pointSql, aoi)] : []),
    ...(options.spatialFilterEnvelopeSql === undefined
      ? []
      : [makeSpatialFilterPredicateSql(pointSql)]),
  ];
}

/**
 * Returns lat/lng source SQL with the map clock, AOI, and spatial filter
 * applied.
 *
 * Always returns real SQL, even when no filter changes the source: a lat/lng
 * map layer must never pass `undefined` raw SQL downstream, since that falls
 * back to structured-query execution, where a large dataset with no filter is
 * silently capped at 100 rows.
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
  const pointSql = `ST_Point(${quoteSqlIdentifier(options.longitudeColumnName)}, ${quoteSqlIdentifier(options.latitudeColumnName)})`;
  const predicates = _getPointPredicates(options, pointSql);
  if (predicates.length === 0) {
    return wrappedSql;
  }
  const filterCtes =
    options.spatialFilterEnvelopeSql === undefined
      ? ""
      : `WITH ${makeFeaturesCteSqlFromFeatureSource({ cteName: "filter_geoms", source: { type: "envelope", sql: options.spatialFilterEnvelopeSql } })}\n`;
  return `${filterCtes}SELECT * FROM (${wrappedSql}) AS overlay_source WHERE ${predicates.join(" AND ")}`;
}
