import { getNumberFromCellValue } from "../../getNumberFromCellValue/getNumberFromCellValue";
import { getBucketStartFromDate } from "../getBucketStartFromDate/getBucketStartFromDate";
import { getDateFromCellValue } from "../getDateFromCellValue/getDateFromCellValue";
import type { EpicurveInterval } from "../getBucketStartFromDate/getBucketStartFromDate";
import type {
  AvandarApi,
  PluginChartSpec,
  PluginVizContext,
  PluginVizInput,
  PluginVizSettingValue,
  PluginVizTransformResult,
} from "@avandar/plugin-sdk";

/** The output column holding each bar's bucket start, as `YYYY-MM-DD`. */
const BUCKET_COLUMN = "bucket";

/** The output column of the one series drawn without a stack-by column. */
const CASES_COLUMN = "cases";

/** The output column of the series that sums every value past the top 8. */
const OTHER_COLUMN = "series_other";

/** How many stack-by values get a series of their own. */
const MAX_NAMED_SERIES = 8;

const DAY_IN_MILLISECONDS = 86_400_000;

const INTERVALS: readonly EpicurveInterval[] = ["day", "epiWeek", "month"];

/**
 * A stack-by value, or `undefined` for a row with no value. Rows without a
 * stack-by column all fall under `undefined` too, as one series.
 */
type StackValue = string | undefined;

type EpicurveSettings = Readonly<{
  dateColumn: string;
  countColumn: string | undefined;
  interval: EpicurveInterval;
  stackByColumn: string | undefined;
}>;

type EpicurveCounts = Readonly<{
  /** Cases per bucket start, then per stack-by value. */
  countsByBucket: Map<string, Map<StackValue, number>>;
  /** Cases per stack-by value, over every bucket. */
  totalsByStackValue: Map<StackValue, number>;
}>;

type EpicurveSeries = Readonly<{
  column: string;
  label: string;
  /** The stack-by values whose cases this series adds up. */
  stackValues: readonly StackValue[];
}>;

function _getColumnFromSetting(
  value: PluginVizSettingValue | undefined,
): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function _getSettingsFromInput(
  settings: PluginVizInput["settings"],
): EpicurveSettings {
  const dateColumn = _getColumnFromSetting(settings.dateColumn);
  if (dateColumn === undefined) {
    throw new Error('The epicurve needs a "dateColumn" setting.');
  }
  return {
    dateColumn,
    countColumn: _getColumnFromSetting(settings.countColumn),
    interval:
      INTERVALS.find((interval) => {
        return interval === settings.interval;
      }) ?? "epiWeek",
    stackByColumn: _getColumnFromSetting(settings.stackByColumn),
  };
}

function _getStackValueFromCell(value: unknown): StackValue {
  return value === null || value === undefined || value === ""
    ? undefined
    : String(value);
}

function _addCount(options: {
  counts: Map<StackValue, number>;
  stackValue: StackValue;
  caseCount: number;
}): void {
  const { counts, stackValue, caseCount } = options;
  counts.set(stackValue, (counts.get(stackValue) ?? 0) + caseCount);
}

/** Adds up the cases per bucket and stack-by value. Skips undated rows. */
function _countRows(options: {
  rows: PluginVizInput["rows"];
  settings: EpicurveSettings;
}): EpicurveCounts {
  const { rows, settings } = options;
  const counts: EpicurveCounts = {
    countsByBucket: new Map(),
    totalsByStackValue: new Map(),
  };
  rows.forEach((row) => {
    const date = getDateFromCellValue(row[settings.dateColumn]);
    if (date === undefined) {
      return;
    }
    const bucketStart = getBucketStartFromDate({
      date,
      interval: settings.interval,
    });
    const caseCount =
      settings.countColumn === undefined
        ? 1
        : (getNumberFromCellValue(row[settings.countColumn]) ?? 0);
    const stackValue =
      settings.stackByColumn === undefined
        ? undefined
        : _getStackValueFromCell(row[settings.stackByColumn]);
    const bucketCounts =
      counts.countsByBucket.get(bucketStart) ?? new Map<StackValue, number>();
    _addCount({ counts: bucketCounts, stackValue, caseCount });
    counts.countsByBucket.set(bucketStart, bucketCounts);
    _addCount({ counts: counts.totalsByStackValue, stackValue, caseCount });
  });
  return counts;
}

/** Orders values by text, with the missing value last. */
function _compareStackValues(valueA: StackValue, valueB: StackValue): number {
  if (valueA === valueB) {
    return 0;
  }
  if (valueA === undefined || valueB === undefined) {
    return valueA === undefined ? 1 : -1;
  }
  return valueA < valueB ? -1 : 1;
}

/** Orders stack-by values from the most cases to the fewest. */
function _getRankedStackValues(
  totals: ReadonlyMap<StackValue, number>,
): StackValue[] {
  return [...totals.entries()]
    .sort(([valueA, totalA], [valueB, totalB]) => {
      return totalB - totalA || _compareStackValues(valueA, valueB);
    })
    .map(([stackValue]) => {
      return stackValue;
    });
}

/**
 * One series per stack-by value for the 8 values with the most cases, then
 * "Other" for the rest. Without a stack-by column, or without any dated
 * row, a single "Cases" series.
 */
function _getSeriesFromTotals(options: {
  totals: ReadonlyMap<StackValue, number>;
  hasStackByColumn: boolean;
  t: AvandarApi["i18n"]["t"];
}): EpicurveSeries[] {
  const { totals, hasStackByColumn, t } = options;
  const rankedValues = _getRankedStackValues(totals);
  if (!hasStackByColumn || rankedValues.length === 0) {
    const label = t("viz.epicurve.cases");
    return [{ column: CASES_COLUMN, label, stackValues: rankedValues }];
  }
  const namedSeries = rankedValues
    .slice(0, MAX_NAMED_SERIES)
    .map((stackValue, index) => {
      return {
        column: `series_${index}`,
        label: stackValue ?? t("viz.epicurve.unknown"),
        stackValues: [stackValue],
      };
    });
  const otherValues = rankedValues.slice(MAX_NAMED_SERIES);
  return otherValues.length === 0
    ? namedSeries
    : [
        ...namedSeries,
        {
          column: OTHER_COLUMN,
          label: t("viz.epicurve.other"),
          stackValues: otherValues,
        },
      ];
}

function _getDateFromBucketStart(bucketStart: string): Date {
  return new Date(`${bucketStart}T00:00:00.000Z`);
}

function _getBucketCount(options: {
  first: Date;
  last: Date;
  interval: EpicurveInterval;
}): number {
  const { first, last, interval } = options;
  if (interval === "month") {
    const yearCount = last.getUTCFullYear() - first.getUTCFullYear();
    return yearCount * 12 + last.getUTCMonth() - first.getUTCMonth() + 1;
  }
  const stepInDays = interval === "epiWeek" ? 7 : 1;
  const elapsed = last.getTime() - first.getTime();
  return Math.round(elapsed / (stepInDays * DAY_IN_MILLISECONDS)) + 1;
}

function _getNthBucketStart(options: {
  first: Date;
  index: number;
  interval: EpicurveInterval;
}): string {
  const { first, index, interval } = options;
  const date = new Date(first.getTime());
  if (interval === "month") {
    date.setUTCMonth(first.getUTCMonth() + index);
  } else {
    const stepInDays = interval === "epiWeek" ? 7 : 1;
    date.setUTCDate(first.getUTCDate() + index * stepInDays);
  }
  return getBucketStartFromDate({ date, interval });
}

/**
 * Every bucket start from the first counted bucket to the last, so a bucket
 * with no cases still gets a bar of zero.
 */
function _getBucketStartsFromCounts(options: {
  countsByBucket: ReadonlyMap<string, unknown>;
  interval: EpicurveInterval;
}): string[] {
  const { countsByBucket, interval } = options;
  const countedStarts = [...countsByBucket.keys()].sort();
  const firstStart = countedStarts[0];
  const lastStart = countedStarts[countedStarts.length - 1];
  if (firstStart === undefined || lastStart === undefined) {
    return [];
  }
  const first = _getDateFromBucketStart(firstStart);
  const last = _getDateFromBucketStart(lastStart);
  return Array.from(
    { length: _getBucketCount({ first, last, interval }) },
    (_value, index) => {
      return _getNthBucketStart({ first, index, interval });
    },
  );
}

function _makeRowsFromCounts(options: {
  bucketStarts: readonly string[];
  countsByBucket: ReadonlyMap<string, ReadonlyMap<StackValue, number>>;
  series: readonly EpicurveSeries[];
}): Array<Record<string, string | number>> {
  const { bucketStarts, countsByBucket, series } = options;
  return bucketStarts.map((bucketStart) => {
    const bucketCounts = countsByBucket.get(bucketStart);
    const seriesEntries = series.map((oneSeries) => {
      const caseCount = oneSeries.stackValues.reduce((sum, stackValue) => {
        return sum + (bucketCounts?.get(stackValue) ?? 0);
      }, 0);
      return [oneSeries.column, caseCount] as const;
    });
    return Object.fromEntries([[BUCKET_COLUMN, bucketStart], ...seriesEntries]);
  });
}

function _makeChartFromSeries(
  series: readonly EpicurveSeries[],
): PluginChartSpec {
  return {
    kind: "bar",
    xColumn: BUCKET_COLUMN,
    xColumnType: "date",
    series: series.map((oneSeries) => {
      return { column: oneSeries.column, label: oneSeries.label };
    }),
    layout: "stack",
    barGap: "none",
  };
}

/**
 * Turns line-list or count rows into an epidemic curve: cases per day, epi
 * week, or month, as touching stacked bars. Every bucket between the first
 * and last date is kept, so a gap in an outbreak shows as zero. With a
 * stack-by column, such as vaccination status, the 8 values with the most
 * cases get their own series and the rest are summed as "Other".
 */
export function makeEpicurveFromRows(
  input: PluginVizInput,
  context: PluginVizContext,
): PluginVizTransformResult {
  const settings = _getSettingsFromInput(input.settings);
  const { countsByBucket, totalsByStackValue } = _countRows({
    rows: input.rows,
    settings,
  });
  const series = _getSeriesFromTotals({
    totals: totalsByStackValue,
    hasStackByColumn: settings.stackByColumn !== undefined,
    t: context.i18n.t,
  });
  const bucketStarts = _getBucketStartsFromCounts({
    countsByBucket,
    interval: settings.interval,
  });
  return {
    rows: _makeRowsFromCounts({ bucketStarts, countsByBucket, series }),
    chart: _makeChartFromSeries(series),
  };
}
