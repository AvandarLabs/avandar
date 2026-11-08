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
 * `UID`, `FIPS`, or `country_code`. Grouping their digits turns a FIPS code
 * of 1001 into "1,001".
 */
const IDENTIFIER_COLUMN_NAME_REGEX =
  /(?:^|[^a-z])(?:id|uid|fips|zip|zipcode|postcode|code\d*)$/i;

/**
 * Column names that may hold a year, such as `year` or `fiscal_year`. A name
 * like `total_deaths_last_year` also ends in "year" and holds a count, so a
 * value in one of these columns only reads as a year when it has four digits.
 */
const YEAR_COLUMN_NAME_REGEX = /(?:^|[^a-z])(?:year|yr)$/i;

/**
 * How one number in the grid reads. Whole numbers show no decimals, so a count
 * of 63,437 deaths does not read as "63,437.00", and ids, codes, and years
 * show plain digits, so the year 2020 does not read as "2,020".
 */
function _formatGridNumber(value: number, columnName: string): string {
  if (!Number.isInteger(value)) {
    return formatChartNumber(value);
  }
  const isYear =
    YEAR_COLUMN_NAME_REGEX.test(columnName) && value >= 1000 && value <= 9999;
  return isYear || IDENTIFIER_COLUMN_NAME_REGEX.test(columnName)
    ? String(value)
    : formatNumber(value, { maximumFractionDigits: 0 });
}

/**
 * The texts of the items in a list cell. A nested list is flattened into the
 * same run of items, and a NULL item is left out, so it never leaves a stray
 * separator.
 */
function _listItemTexts(
  items: readonly unknown[],
  columnName: string,
): string[] {
  return items.flatMap((item) => {
    if (Array.isArray(item)) {
      return _listItemTexts(item, columnName);
    }
    return item == null ? [] : [_formatCellValue(item, columnName)];
  });
}

/**
 * The text of one non-date cell. A list, such as a case type field that
 * keeps every value, shows its values separated by semicolons, which never
 * collide with a number's thousands separator. An empty list is blank.
 */
function _formatCellValue(value: unknown, columnName: string): string {
  if (Array.isArray(value)) {
    return _listItemTexts(value, columnName).join("; ");
  }
  if (typeof value === "number") {
    return _formatGridNumber(value, columnName);
  }
  return value == null ? "" : String(value);
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
            return _formatCellValue(params.value, field);
          },
    };
  });
}
