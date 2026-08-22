import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";

/**
 * Column types the time predicate can compare against without casting the
 * column first.
 *
 * A layer's time column may also be `varchar`, since a CSV import leaves
 * timestamps as text, and that one does need a per-row cast.
 */
const TEMPORAL_DATA_TYPES = new Set(["date", "timestamp"]);

/**
 * The comparison applied to the time column.
 *
 * Casting the column is what makes the predicate expensive: DuckDB has to
 * convert every row before it can compare, which both costs per row and stops
 * it from skipping Parquet row groups whose recorded minimum and maximum
 * already fall outside the range. On a column that is already a date or
 * timestamp the cast buys nothing, so the comparison is made directly and a
 * narrow time window reads only the row groups it can overlap. A text column
 * still has to be cast, since there is nothing else to compare.
 */
function _buildTimeComparisonSql(options: {
  columnSql: string;
  startSql: string;
  endSql: string;
  isTemporalColumn: boolean;
}): string {
  const { columnSql, startSql, endSql } = options;
  if (options.isTemporalColumn) {
    return `${columnSql} >= ${startSql} AND ${columnSql} <= ${endSql}`;
  }
  return `TRY_CAST(${columnSql} AS TIMESTAMP) BETWEEN ${startSql} AND ${endSql}`;
}

/**
 * Wraps source SQL with an inclusive time-range filter on the time column.
 *
 * @param options.sourceSql The layer's source SQL to filter.
 * @param options.timeColumnName The layer's bound time column.
 * @param options.timeRange The map clock's current window.
 * @param options.timeColumnDataType The bound column's declared type. Given a
 * `date` or `timestamp`, the column is compared without a cast so DuckDB can
 * skip row groups outside the window; anything else is cast per row.
 * @returns The original SQL when the time column or range is unset.
 */
export function applyTimePredicateToSourceSql(options: {
  sourceSql: string;
  timeColumnName: string | undefined;
  timeRange: AvaMapConfig.TimeRange | undefined;
  timeColumnDataType?: string;
}): string {
  const { sourceSql, timeColumnName, timeRange } = options;
  if (!timeColumnName || !timeRange) {
    return sourceSql;
  }
  const comparison = _buildTimeComparisonSql({
    columnSql: quoteSqlIdentifier(timeColumnName),
    startSql: `TRY_CAST(${quoteSqlLiteral(timeRange.start)} AS TIMESTAMP)`,
    endSql: `TRY_CAST(${quoteSqlLiteral(timeRange.end)} AS TIMESTAMP)`,
    isTemporalColumn: TEMPORAL_DATA_TYPES.has(options.timeColumnDataType ?? ""),
  });
  return `SELECT * FROM (${sourceSql}) AS overlay_source WHERE ${comparison}`;
}
