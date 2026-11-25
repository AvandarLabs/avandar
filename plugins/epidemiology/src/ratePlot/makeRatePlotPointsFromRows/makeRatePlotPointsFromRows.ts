import { getNumberFromCellValue } from "../../getNumberFromCellValue/getNumberFromCellValue";
import type { PluginVizInput } from "@avandar/plugin-sdk";

/** How the rate plot orders its rows: by rate, highest first, or by label. */
export type RatePlotSort = "rate" | "label";

/**
 * One row of the rate plot: a dot at `rate`, and whiskers from `lower` to
 * `upper` when both bounds are numbers.
 */
export type RatePlotPoint = Readonly<{
  label: string;
  rate: number;
  lower: number | undefined;
  upper: number | undefined;
}>;

type RatePlotPointsOptions = Readonly<{
  rows: PluginVizInput["rows"];
  labelColumn: string;
  rateColumn: string;
  lowerColumn: string | undefined;
  upperColumn: string | undefined;
  sort: RatePlotSort;
}>;

function _getLabelFromCell(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function _getBoundFromRow(options: {
  row: PluginVizInput["rows"][number];
  column: string | undefined;
}): number | undefined {
  const { row, column } = options;
  return column === undefined ? undefined : getNumberFromCellValue(row[column]);
}

function _compareByRate(pointA: RatePlotPoint, pointB: RatePlotPoint): number {
  return pointB.rate - pointA.rate || pointA.label.localeCompare(pointB.label);
}

function _compareByLabel(pointA: RatePlotPoint, pointB: RatePlotPoint): number {
  return pointA.label.localeCompare(pointB.label) || pointB.rate - pointA.rate;
}

/**
 * Makes the rate plot's rows from query result rows, such as one row per
 * borough with an incidence rate and its confidence bounds. Rows whose rate
 * is not a number are skipped. A bound that is not a number, or whose column
 * is not set, is undefined, and the row is drawn without whiskers.
 */
export function makeRatePlotPointsFromRows(
  options: RatePlotPointsOptions,
): RatePlotPoint[] {
  const { rows, labelColumn, rateColumn, lowerColumn, upperColumn } = options;
  const points = rows.flatMap((row) => {
    const rate = getNumberFromCellValue(row[rateColumn]);
    if (rate === undefined) {
      return [];
    }
    return [
      {
        label: _getLabelFromCell(row[labelColumn]),
        rate,
        lower: _getBoundFromRow({ row, column: lowerColumn }),
        upper: _getBoundFromRow({ row, column: upperColumn }),
      },
    ];
  });
  return points.sort(
    options.sort === "rate" ? _compareByRate : _compareByLabel,
  );
}
