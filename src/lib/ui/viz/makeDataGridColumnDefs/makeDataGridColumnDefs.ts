import { formatNumber } from "@avandar/utils";
import { formatChartNumber } from "@/lib/ui/viz/formatChartNumber/formatChartNumber";
import { formatQueryResultDate } from "@/lib/ui/viz/formatQueryResultDate/formatQueryResultDate";
import type { FormattableTimezone, UnknownDataFrame } from "@avandar/utils";

/** The AG Grid column definition a `DataGrid` builds for each field. */
export type DataGridColumnDef = {
  field: string;
  headerName: string;
  filter: true;
  valueFormatter: (params: { value: unknown }) => string;
};

const DATE_ONLY_FORMAT = "YYYY-MM-DD";
const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Column names whose whole numbers are labels rather than amounts, such as
 * `year`, `UID`, `FIPS`, or `country_code`. Grouping their digits turns the
 * year 2020 into "2,020".
 */
const IDENTIFIER_COLUMN_NAME_REGEX =
  /(?:^|[^a-z])(?:year|yr|id|uid|fips|zip|zipcode|postcode|code\d*)$/i;

/**
 * How one number in the grid reads. Whole numbers show no decimals, so a count
 * of 63,437 deaths does not read as "63,437.00", and whole numbers in a
 * year, id, or code column show plain digits.
 */
function _formatGridNumber(value: number, columnName: string): string {
  if (!Number.isInteger(value)) {
    return formatChartNumber(value);
  }
  return IDENTIFIER_COLUMN_NAME_REGEX.test(columnName)
    ? String(value)
    : formatNumber(value, { maximumFractionDigits: 0 });
}

/**
 * Whether every value in a date column falls on midnight UTC, which is how a
 * `DATE` or a day, month, or year bucket from `date_trunc` arrives. Those
 * columns show only the date, since a `00:00:00` on every row says nothing.
 */
function _isDateOnlyColumn(
  options: Readonly<{ data: UnknownDataFrame; field: string }>,
): boolean {
  let hasValue = false;
  const isEveryValueMidnight = options.data.every((row) => {
    const value = row[options.field];
    if (value === null || value === undefined) {
      return true;
    }
    hasValue = true;
    const epochMs =
      typeof value === "number" ? value : new Date(value as never).getTime();
    return Number.isFinite(epochMs) && epochMs % MILLISECONDS_PER_DAY === 0;
  });
  return hasValue && isEveryValueMidnight;
}

/**
 * Builds the AG Grid column definitions for a `DataGrid`, including how each
 * cell's value is displayed.
 *
 * Dates render through `formatQueryResultDate`, so a stored date shows on its
 * own calendar day for every user.
 */
export function makeDataGridColumnDefs(
  options: Readonly<{
    columnNames: readonly string[];
    data: UnknownDataFrame;
    dateColumns: ReadonlySet<string> | undefined;
    dateFormat: string;
    timezone?: FormattableTimezone;
  }>,
): DataGridColumnDef[] {
  const { columnNames, data, dateColumns, dateFormat, timezone } = options;
  return columnNames.map((field) => {
    const isDate = dateColumns?.has(field) ?? false;
    const columnDateFormat =
      isDate && _isDateOnlyColumn({ data, field })
        ? DATE_ONLY_FORMAT
        : dateFormat;
    return {
      field: field,
      headerName: field,
      filter: true,
      valueFormatter: isDate
        ? (params: { value: unknown }) => {
            return formatQueryResultDate(params.value, {
              format: columnDateFormat,
              timezone,
            });
          }
        : (params: { value: unknown }) => {
            return typeof params.value === "number"
              ? _formatGridNumber(params.value, field)
              : params.value == null
                ? ""
                : String(params.value);
          },
    };
  });
}
