import { makeColumnNameSlugFromName } from "../../derivedColumns/makeColumnNameSlugFromName/makeColumnNameSlugFromName";
import type { DerivedColumn } from "@avandar/plugin-sdk";

/** How far back a rolling average reaches, such as 7 days or 2 weeks. */
export type RollingWindow = Readonly<{ size: number; unit: "day" | "week" }>;

const DAYS_PER_UNIT = { day: 1, week: 7 } as const;

/** The part of the column name that says the window's unit. */
const UNIT_NAME_SUFFIXES = { day: "d", week: "w" } as const;

/**
 * Makes the column the "Rolling average" command adds: the average of
 * `valueColumn` over the window ending at each row's date, such as
 * `cases_7d_avg` for 7 days of `cases`. With a group-by column, each group
 * is averaged on its own.
 *
 * The window is a date range, not a row count, so a missing day does not
 * stretch it, and every row with a date inside it counts. That fits a result
 * with one row per date, or per date and group.
 */
export function makeRollingAverageColumnFromOptions(
  options: Readonly<{
    valueColumn: string;
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
  return {
    name: `${makeColumnNameSlugFromName(valueColumn)}_${size}${UNIT_NAME_SUFFIXES[unit]}_avg`,
    expression:
      `avg({value}) OVER (${partition}ORDER BY {date} ` +
      `RANGE BETWEEN INTERVAL ${precedingDays} DAY PRECEDING AND CURRENT ROW)`,
    inputs:
      options.groupByColumn === undefined
        ? { value: valueColumn, date: dateColumn }
        : {
            value: valueColumn,
            date: dateColumn,
            group: options.groupByColumn,
          },
  };
}
