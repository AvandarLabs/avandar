/**
 * How an epicurve groups dates into bars: one bar per UTC day, per epi week
 * (Sunday to Saturday, as the CDC's MMWR weeks run), or per calendar month.
 */
export type EpicurveInterval = "day" | "epiWeek" | "month";

const DAY_IN_MILLISECONDS = 86_400_000;

/** How many whole days a date sits after the start of its bucket. */
const DAYS_INTO_BUCKET: Record<EpicurveInterval, (date: Date) => number> = {
  day: () => {
    return 0;
  },
  epiWeek: (date) => {
    return date.getUTCDay();
  },
  month: (date) => {
    return date.getUTCDate() - 1;
  },
};

function _getTextFromUtcDate(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Gets the first day of the bucket a date falls in, as `YYYY-MM-DD` in UTC,
 * so dates can be grouped and the buckets sorted as text. An epi week starts
 * on the Sunday on or before the date, which matches MMWR weeks, including
 * week 53 in the years that have one.
 */
export function getBucketStartFromDate(
  options: Readonly<{ date: Date; interval: EpicurveInterval }>,
): string {
  const { date, interval } = options;
  const dayStart =
    Math.floor(date.getTime() / DAY_IN_MILLISECONDS) * DAY_IN_MILLISECONDS;
  const bucketStart =
    dayStart - DAYS_INTO_BUCKET[interval](date) * DAY_IN_MILLISECONDS;
  return _getTextFromUtcDate(new Date(bucketStart));
}
