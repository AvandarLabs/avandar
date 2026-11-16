import { formatDate } from "@avandar/utils";
import { QUERY_RESULT_TIMEZONE } from "@/lib/ui/viz/ChartConstants";
import type { FormattableTimezone } from "@avandar/utils";

const DATE_TIME_TEXT_REGEX = /\d[T ]\d{2}:\d{2}/;
const ZONE_DESIGNATOR_REGEX = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * The zone to render one date value in. Text such as `2022-01-01 10:00:00`
 * has a time but no zone, and JavaScript parses it in the browser's zone, so
 * it renders there too. Every other value renders in `timezone`.
 */
function _getZoneForValue(
  value: unknown,
  timezone: FormattableTimezone,
): FormattableTimezone {
  return typeof value === "string" &&
    DATE_TIME_TEXT_REGEX.test(value) &&
    !ZONE_DESIGNATOR_REGEX.test(value.trim())
    ? "local"
    : timezone;
}

/**
 * Formats a date or timestamp from a query result so it shows the value that
 * is stored, whatever the viewer's time zone.
 *
 * Values render in `QUERY_RESULT_TIMEZONE` unless `timezone` is given.
 */
export function formatQueryResultDate(
  value: unknown,
  options: Readonly<{ format: string; timezone?: FormattableTimezone }>,
): string {
  const { format, timezone = QUERY_RESULT_TIMEZONE } = options;
  return formatDate(value, {
    format,
    zone: _getZoneForValue(value, timezone),
  });
}
