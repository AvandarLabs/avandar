import type { UnknownDataFrame } from "@avandar/utils";

/** The numeric range a value axis must cover. */
export type ValueExtent = { min: number; max: number };

/**
 * A series contributing to an axis extent. Series sharing a `stackId`
 * stack on top of each other, so their values sum row-wise; a series
 * with no `stackId` stands alone.
 */
export type ExtentSeries = { key: string; stackId?: string };

/**
 * Bucket key for a series. Stacked series key by their `stackId` (a
 * string), ungrouped series by their index (a number). Keying the two
 * kinds with two different primitive types means a user-typed stack
 * group can never collide with a generated key: `stackId` is a
 * free-text control in the bar chart form.
 */
function _bucketKeyFor({
  series,
  index,
}: Readonly<{
  series: Readonly<ExtentSeries>;
  index: number;
}>): string | number {
  return series.stackId ?? index;
}

/**
 * Returns a finite number for numbers, bigints, and non-blank numeric strings,
 * otherwise `NaN`.
 */
function _toFiniteNumber(cell: unknown): number {
  if (typeof cell === "number") {
    return cell;
  }
  if (typeof cell === "bigint") {
    return Number(cell);
  }
  if (typeof cell === "string" && cell.trim() !== "") {
    return Number(cell);
  }
  return Number.NaN;
}

/**
 * Returns the finite value extent for the series, including row-wise stack
 * totals, or `undefined` when there is nothing finite to measure.
 */
export function computeValueExtent({
  data,
  series,
}: Readonly<{
  data: Readonly<UnknownDataFrame>;
  series: readonly ExtentSeries[];
}>): ValueExtent | undefined {
  if (series.length === 0) {
    return undefined;
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sawFiniteValue = false;

  data.forEach((row) => {
    const positiveSums = new Map<string | number, number>();
    const negativeSums = new Map<string | number, number>();

    series.forEach((seriesConfig, index) => {
      const value = _toFiniteNumber(row[seriesConfig.key]);
      if (!Number.isFinite(value)) {
        return;
      }
      sawFiniteValue = true;
      const sums = value < 0 ? negativeSums : positiveSums;
      const bucket = _bucketKeyFor({ series: seriesConfig, index });
      sums.set(bucket, (sums.get(bucket) ?? 0) + value);
    });

    const widen = (total: number): void => {
      if (total > max) {
        max = total;
      }
      if (total < min) {
        min = total;
      }
    };
    positiveSums.forEach(widen);
    negativeSums.forEach(widen);
  });

  return sawFiniteValue ? { min, max } : undefined;
}
