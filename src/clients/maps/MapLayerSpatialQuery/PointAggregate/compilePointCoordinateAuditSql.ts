import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";
import type { DropReason } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";

/** Result column names the audit query returns, one row of them. */
export const PointCoordinateAuditColumns = {
  sourceRowCount: "source_row_count",
  mappableRowCount: "mappable_row_count",
  distinctCoordinateCount: "distinct_coordinate_count",
} as const;

/**
 * The audit's result column for each drop reason.
 *
 * Keyed by the reason the browser-side conversion reports, so the two
 * paths cannot drift into describing the same lost row differently.
 */
export const PointCoordinateDropColumns: Record<DropReason, string> = {
  nullCoordinate: "drop_null_coordinate",
  nonNumericCoordinate: "drop_non_numeric_coordinate",
  outOfRange: "drop_out_of_range",
  suspectedLatLngSwap: "drop_suspected_lat_lng_swap",
  nullIsland: "drop_null_island",
};

type CompilePointCoordinateAuditSqlOptions = {
  /** The layer's filtered source SQL, time and AOI predicates included. */
  sourceSql: string;
  latitudeColumnName: string;
  longitudeColumnName: string;
};

const RAW_LATITUDE = "__audit_raw_latitude";
const RAW_LONGITUDE = "__audit_raw_longitude";
const LATITUDE = "__audit_latitude";
const LONGITUDE = "__audit_longitude";
const REASON = "__audit_reason";

/**
 * SQL classifying one row exactly as the browser-side conversion does, in the
 * same order, so the reason reported for a row does not depend on which path
 * happened to look at it.
 *
 * The null island is tested before the range check because `0, 0` is in range
 * but almost always means "no coordinate recorded", and a suspected swap is
 * only claimed when swapping the pair would actually produce a valid point.
 */
function _buildReasonSql(): string {
  return `CASE
        WHEN ${RAW_LATITUDE} IS NULL OR ${RAW_LONGITUDE} IS NULL THEN 'nullCoordinate'
        WHEN ${LATITUDE} IS NULL OR ${LONGITUDE} IS NULL THEN 'nonNumericCoordinate'
        WHEN ${LATITUDE} = 0.0 AND ${LONGITUDE} = 0.0 THEN 'nullIsland'
        WHEN abs(${LATITUDE}) <= 90.0 AND abs(${LONGITUDE}) <= 180.0 THEN NULL
        WHEN abs(${LATITUDE}) > 90.0
          AND abs(${LATITUDE}) <= 180.0
          AND abs(${LONGITUDE}) <= 90.0 THEN 'suspectedLatLngSwap'
        ELSE 'outOfRange'
      END`;
}

/** The `count(*) FILTER` selection for one drop reason. */
function _buildDropCountSql(reason: DropReason): string {
  return `count(*) FILTER (WHERE ${REASON} = ${quoteSqlLiteral(reason)}) AS ${PointCoordinateDropColumns[reason]}`;
}

/**
 * Compiles the single-row query that decides how a point layer must be loaded.
 *
 * It answers three questions in one scan. How many rows the layer's filters
 * return, which selects between loading rows directly and aggregating them in
 * SQL. How many rows carry a coordinate no map can place, broken down by
 * reason, which is what lets a layer keep reporting "N of M rows mapped"
 * honestly after aggregation, when the browser no longer holds the rows to
 * count for itself. And how many distinct coordinates those rows cover, which
 * is an upper bound on the cells any grid can produce: when it already fits
 * the cell ceiling, the aggregation can skip probing resolutions entirely and
 * save a scan on every zoom change.
 *
 * @param options.sourceSql The layer's filtered source SQL.
 * @param options.latitudeColumnName The layer's bound latitude column.
 * @param options.longitudeColumnName The layer's bound longitude column.
 * @returns SQL returning exactly one row, whatever the source contains.
 */
export function compilePointCoordinateAuditSql(
  options: Readonly<CompilePointCoordinateAuditSqlOptions>,
): string {
  const dropCounts = (
    Object.keys(PointCoordinateDropColumns) as DropReason[]
  ).map(_buildDropCountSql);

  return `WITH __audit_source AS (${options.sourceSql}),
  __audit_coordinates AS (
    SELECT
      ${quoteSqlIdentifier(options.latitudeColumnName)} AS ${RAW_LATITUDE},
      ${quoteSqlIdentifier(options.longitudeColumnName)} AS ${RAW_LONGITUDE},
      TRY_CAST(${quoteSqlIdentifier(options.latitudeColumnName)} AS DOUBLE) AS ${LATITUDE},
      TRY_CAST(${quoteSqlIdentifier(options.longitudeColumnName)} AS DOUBLE) AS ${LONGITUDE}
    FROM __audit_source
  ),
  __audit_classified AS (
    SELECT
      ${LATITUDE},
      ${LONGITUDE},
      ${_buildReasonSql()} AS ${REASON}
    FROM __audit_coordinates
  )
SELECT
    count(*) AS ${PointCoordinateAuditColumns.sourceRowCount},
    count(*) FILTER (WHERE ${REASON} IS NULL) AS ${PointCoordinateAuditColumns.mappableRowCount},
    count(DISTINCT (${LATITUDE}, ${LONGITUDE})) FILTER (WHERE ${REASON} IS NULL) AS ${PointCoordinateAuditColumns.distinctCoordinateCount},
    ${dropCounts.join(",\n    ")}
  FROM __audit_classified`;
}
