import { quoteSqlIdentifier } from "@avandar/utils/sql";

import {
  PointAggregateProperties,
  WEB_MERCATOR_MAX_LATITUDE,
} from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.constants";

/** CTE and column names the aggregation reserves for its own use. */
const AggregateAliases = {
  source: "__point_aggregate_source",
  coordinates: "__point_aggregate_coordinates",
  cells: "__point_aggregate_cells",
  latitude: "__point_aggregate_latitude",
  longitude: "__point_aggregate_longitude",
  value: "__point_aggregate_value",
  cellX: "__point_aggregate_cell_x",
  cellY: "__point_aggregate_cell_y",
} as const;

type CompilePointAggregateSqlOptions = {
  /** The layer's filtered source SQL, time and AOI predicates included. */
  sourceSql: string;
  latitudeColumnName: string;
  longitudeColumnName: string;

  /** Grid resolution, from {@link getPointAggregateCellsAcross}. */
  cellsAcross: number;

  /**
   * Numeric column driving data-dependent paint, summed per cell. Omitted
   * when the layer's symbology paints no value.
   */
  valueColumnName?: string;
};

/**
 * SQL for the normalized Web Mercator y of a latitude, in `0..1`.
 *
 * The latitude is clamped to the projection's limit rather than filtered, so
 * a row at the pole groups into the outermost cell row instead of producing
 * a non-finite index and disappearing from the map.
 */
function _buildMercatorYSql(latitudeSql: string): string {
  const clamped = `least(greatest(${latitudeSql}, ${-WEB_MERCATOR_MAX_LATITUDE}), ${WEB_MERCATOR_MAX_LATITUDE})`;
  return `((1.0 - ln(tan(pi() / 4.0 + ((${clamped}) * pi()) / 360.0)) / pi()) / 2.0)`;
}

/** SQL for the normalized Web Mercator x of a longitude, in `0..1`. */
function _buildMercatorXSql(longitudeSql: string): string {
  return `(((${longitudeSql}) + 180.0) / 360.0)`;
}

/** SQL for an in-range integer cell index along one axis. */
function _buildCellIndexSql(
  normalizedSql: string,
  cellsAcross: number,
): string {
  return `CAST(least(${cellsAcross - 1}, greatest(0, floor(${normalizedSql} * ${cellsAcross}))) AS BIGINT)`;
}

/**
 * SQL matching MapLibre's own `point_count_abbreviated`: exact below a
 * thousand, one decimal thousand below ten thousand, whole thousands above.
 *
 * Computed here because a MapLibre style expression cannot call a formatter,
 * so the label layer can only read a property that already holds the text.
 */
function _buildAbbreviatedCountSql(countSql: string): string {
  return `CASE
      WHEN ${countSql} >= 10000 THEN CAST(CAST(round(${countSql} / 1000.0) AS BIGINT) AS VARCHAR) || 'k'
      WHEN ${countSql} >= 1000 THEN CAST(round(${countSql} / 1000.0, 1) AS VARCHAR) || 'k'
      ELSE CAST(${countSql} AS VARCHAR)
    END`;
}

/**
 * Reads the coordinate and value columns out of the source as numbers.
 *
 * `TRY_CAST` rather than `CAST` so a non-numeric coordinate becomes `NULL` and
 * is excluded by the mappable filter, instead of failing the whole query and
 * blanking a layer because of one bad row.
 */
function _buildCoordinateProjectionSql(
  options: Readonly<CompilePointAggregateSqlOptions>,
): string {
  const valueSelection =
    options.valueColumnName === undefined
      ? ""
      : `,\n        TRY_CAST(${quoteSqlIdentifier(options.valueColumnName)} AS DOUBLE) AS ${AggregateAliases.value}`;
  return `SELECT
        TRY_CAST(${quoteSqlIdentifier(options.latitudeColumnName)} AS DOUBLE) AS ${AggregateAliases.latitude},
        TRY_CAST(${quoteSqlIdentifier(options.longitudeColumnName)} AS DOUBLE) AS ${AggregateAliases.longitude}${valueSelection}
      FROM ${AggregateAliases.source}`;
}

/**
 * Keeps only rows a map can actually place, matching what the browser-side
 * row conversion would otherwise drop: a missing or non-numeric coordinate, a
 * coordinate outside the valid range, and the null island at `0, 0`.
 *
 * These rows are excluded from cells rather than forced into one, and the
 * coordinate audit query counts them by reason, so the layer's "rows mapped"
 * status still reports them.
 */
function _buildMappableFilterSql(): string {
  const latitude = AggregateAliases.latitude;
  const longitude = AggregateAliases.longitude;
  return `${latitude} IS NOT NULL
        AND ${longitude} IS NOT NULL
        AND abs(${latitude}) <= 90.0
        AND abs(${longitude}) <= 180.0
        AND NOT (${latitude} = 0.0 AND ${longitude} = 0.0)`;
}

/**
 * Compiles SQL that collapses a point layer into one row per grid cell.
 *
 * This is what keeps a large point layer renderable: the browser receives one
 * row per occupied cell rather than one per source row, so its cost tracks
 * what is on screen instead of the size of the dataset. Each cell carries the
 * mean coordinate of its rows, how many rows it represents, and the sum of the
 * layer's value column, which is enough for cluster paint and for a
 * proportional symbol to keep encoding a data value.
 *
 * Output columns are named after the layer's own latitude and longitude
 * columns so the existing row-to-GeoJSON conversion reads them unchanged, and
 * the count properties are named the way MapLibre names its own, so one set of
 * cluster paint layers renders either source.
 *
 * @param options.sourceSql The layer's filtered source SQL.
 * @param options.latitudeColumnName Latitude column, also the output's name.
 * @param options.longitudeColumnName Longitude column, also the output's name.
 * @param options.cellsAcross Grid resolution across the whole world.
 * @param options.valueColumnName Numeric column to sum per cell, if any.
 * @returns SQL returning at most `cellsAcross ** 2` rows, and never more than
 * the number of distinct source coordinates.
 */
export function compilePointAggregateSql(
  options: Readonly<CompilePointAggregateSqlOptions>,
): string {
  const cellCountSql = "count(*)";
  const valueSelection =
    options.valueColumnName === undefined
      ? ""
      : `,\n    sum(${AggregateAliases.value}) AS ${quoteSqlIdentifier(options.valueColumnName)}`;

  return `WITH ${AggregateAliases.source} AS (${options.sourceSql}),
  ${AggregateAliases.coordinates} AS (${_buildCoordinateProjectionSql(options)}),
  ${AggregateAliases.cells} AS (
    SELECT
      ${_buildCellIndexSql(_buildMercatorXSql(AggregateAliases.longitude), options.cellsAcross)} AS ${AggregateAliases.cellX},
      ${_buildCellIndexSql(_buildMercatorYSql(AggregateAliases.latitude), options.cellsAcross)} AS ${AggregateAliases.cellY},
      *
    FROM ${AggregateAliases.coordinates}
    WHERE ${_buildMappableFilterSql()}
  )
SELECT
    avg(${AggregateAliases.latitude}) AS ${quoteSqlIdentifier(options.latitudeColumnName)},
    avg(${AggregateAliases.longitude}) AS ${quoteSqlIdentifier(options.longitudeColumnName)},
    ${cellCountSql} AS ${quoteSqlIdentifier(PointAggregateProperties.pointCount)},
    ${_buildAbbreviatedCountSql(cellCountSql)} AS ${quoteSqlIdentifier(PointAggregateProperties.abbreviated)}${valueSelection}
  FROM ${AggregateAliases.cells}
  GROUP BY ${AggregateAliases.cellX}, ${AggregateAliases.cellY}`;
}
