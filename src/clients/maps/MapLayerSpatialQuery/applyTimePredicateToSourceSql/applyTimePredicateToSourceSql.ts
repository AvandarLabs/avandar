import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/**
 * Wraps source SQL with an inclusive timestamp BETWEEN on the time column.
 *
 * @returns The original SQL when the time column or range is unset.
 */
export function applyTimePredicateToSourceSql(options: {
  sourceSql: string;
  timeColumnName: string | undefined;
  timeRange: AvaMapConfig.TimeRange | undefined;
}): string {
  const { sourceSql, timeColumnName, timeRange } = options;
  if (!timeColumnName || !timeRange) {
    return sourceSql;
  }
  const column = quoteSqlIdentifier(timeColumnName);
  const start = quoteSqlLiteral(timeRange.start);
  const end = quoteSqlLiteral(timeRange.end);
  return `SELECT * FROM (${sourceSql}) AS overlay_source WHERE TRY_CAST(${column} AS TIMESTAMP) BETWEEN TRY_CAST(${start} AS TIMESTAMP) AND TRY_CAST(${end} AS TIMESTAMP)`;
}
