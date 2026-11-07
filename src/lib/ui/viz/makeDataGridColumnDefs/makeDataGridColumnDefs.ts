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
  const {
    columnNames,
    data,
    dateColumns,
    dateFormat,
    timezone,
  } = options;
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
              ? formatChartNumber(params.value)
              : params.value == null
                ? ""
                : String(params.value);
          },
    };
  });
}
