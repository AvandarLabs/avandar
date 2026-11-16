import { makeColumnNameSlugFromName } from "../../derivedColumns/makeColumnNameSlugFromName/makeColumnNameSlugFromName";
import type { DerivedColumn } from "@avandar/plugin-sdk";

/** How far back a rolling average reaches, such as 7 days or 2 weeks. */
export type RollingWindow = Readonly<{ size: number; unit: "day" | "week" }>;

const DAYS_PER_UNIT = { day: 1, week: 7 } as const;

/** The part of the column name that says the window's unit. */
const UNIT_NAME_SUFFIXES = { day: "d", week: "w" } as const;

/**
 * Makes the column the "Rolling average" command adds. With a value column
 * it is the average of that column over the window ending at each row's
 * date, such as `cases_7d_avg`. With no value column, each row counts as 1
 * and the column is the average number of rows per day, `count_7d_avg`,
 * which fits a line list. A group-by column averages each group on its own.
 *
 * The window is a date range, not a row count, so a missing day does not
 * stretch it. A value column averages only the rows inside the window. A
 * line list divides the row count by the window's length in days, so a day
 * with no rows counts as zero.
 */
export function makeRollingAverageColumnFromOptions(
  options: Readonly<{
    valueColumn: string | undefined;
    dateColumn: string;
    window: RollingWindow;
    groupByColumn: string | undefined;
  }>,
): DerivedColumn {
  const { valueColumn, dateColumn, window: rollingWindow } = options;
  const { size, unit } = rollingWindow;
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(
      `A rolling window must be a whole number of at least 1, not ${size}`,
    );
  }
  const precedingDays = size * DAYS_PER_UNIT[unit] - 1;
  const partition =
    options.groupByColumn === undefined ? "" : "PARTITION BY {group} ";
  const frame =
    `${partition}ORDER BY {date} ` +
    `RANGE BETWEEN INTERVAL ${precedingDays} DAY PRECEDING AND CURRENT ROW`;
  const inputs: Record<string, string> =
    valueColumn === undefined
      ? { date: dateColumn }
      : { value: valueColumn, date: dateColumn };
  if (options.groupByColumn !== undefined) {
    inputs.group = options.groupByColumn;
  }
  if (valueColumn === undefined) {
    const windowDays = size * DAYS_PER_UNIT[unit];
    return {
      name: `count_${size}${UNIT_NAME_SUFFIXES[unit]}_avg`,
      expression: `count(*) OVER (${frame}) / ${windowDays}.0`,
      inputs,
    };
  }
  return {
    name: `${makeColumnNameSlugFromName(valueColumn)}_${size}${UNIT_NAME_SUFFIXES[unit]}_avg`,
    expression: `avg({value}) OVER (${frame})`,
    inputs,
  };
}
