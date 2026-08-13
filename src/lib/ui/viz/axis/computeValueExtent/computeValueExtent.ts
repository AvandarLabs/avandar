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
 * group can never collide with a generated key — `stackId` is a
 * free-text control in the bar chart form.
 */
function _bucketKeyFor(series: ExtentSeries, index: number): string | number {
  return series.stackId ?? index;
}

/**
 * Coerce a cell to a finite number, or `NaN` when it is not numeric.
 *
 * `Number()` on its own is far too permissive: it turns `null`, `""`,
 * `[]`, and `false` all into a finite `0`, which would silently drag an
 * axis extent down to zero. Only real numbers, bigints (DuckDB returns
 * `bigint` columns as such), and non-blank numeric strings count.
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
 * The extent a value axis needs to cover for the given series.
 *
 * Values are bucketed per row by `stackId`, with positives and
 * negatives summed separately within a bucket. That one rule covers
 * every layout we render: grouped (each series is its own bucket, so
 * the result is the plain per-column min/max), stacked (one shared
 * bucket, so the result is the row-wise sum), several independent
 * stacks in one chart, and Recharts' sign-split stacking where
 * positives grow upward and negatives downward.
 *
 * Returns `undefined` when there is nothing finite to measure, which
 * tells callers to leave the axis to Recharts.
 */
export function computeValueExtent(
  data: UnknownDataFrame,
  series: readonly ExtentSeries[],
): ValueExtent | undefined {
  if (series.length === 0) {
    return undefined;
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sawFiniteValue = false;

  data.forEach((row) => {
    const positiveSums = new Map<string | number, number>();
    const negativeSums = new Map<string | number, number>();

    series.forEach((s, index) => {
      const value = _toFiniteNumber(row[s.key]);
      if (!Number.isFinite(value)) {
        return;
      }
      sawFiniteValue = true;
      const sums = value < 0 ? negativeSums : positiveSums;
      const bucket = _bucketKeyFor(s, index);
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

  if (!sawFiniteValue) {
    return undefined;
  }
  return { min, max };
}
