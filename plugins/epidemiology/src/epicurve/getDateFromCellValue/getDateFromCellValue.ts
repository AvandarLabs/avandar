/**
 * `YYYY-MM-DD`, optionally followed by a time (`T` or a space, then
 * `HH:MM`, optional seconds and fraction) and an optional zone (`Z` or an
 * offset such as `+05:30`).
 */
const DATE_TEXT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/i;

/** The last year a `YYYY-MM-DD` bucket start can hold. */
const MAX_YEAR = 9999;

function _getValidDate(milliseconds: number): Date | undefined {
  const date = new Date(milliseconds);
  const year = date.getUTCFullYear();
  return Number.isNaN(year) || year < 0 || year > MAX_YEAR ? undefined : date;
}

/** Minutes east of UTC for a zone designator. Undefined when malformed. */
function _getOffsetMinutesFromZone(
  zone: string | undefined,
): number | undefined {
  if (zone === undefined || zone.toUpperCase() === "Z") {
    return 0;
  }
  const digits = zone.slice(1).replace(":", "");
  const hours = Number(digits.slice(0, 2));
  const minutes = Number(digits.slice(2, 4));
  if (hours > 23 || minutes > 59) {
    return undefined;
  }
  return (zone.startsWith("-") ? -1 : 1) * (hours * 60 + minutes);
}

type WallClock = Readonly<{
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  milliseconds: number;
}>;

/**
 * A wall-clock time read as UTC. Undefined for a day or a time of day that
 * does not exist.
 */
function _getUtcDateFromWallClock(wallClock: WallClock): Date | undefined {
  const { year, month, day, hour, minute, second, milliseconds } = wallClock;
  if (hour > 23 || minute > 59 || second > 59) {
    return undefined;
  }
  // `setUTCFullYear` keeps a year below 100 as written, where `Date.UTC`
  // would read 0099 as 1999.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, milliseconds);
  const isRealDay =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  return isRealDay ? date : undefined;
}

function _getDateFromText(text: string): Date | undefined {
  const match = DATE_TEXT_PATTERN.exec(text.trim());
  if (match === null) {
    return undefined;
  }
  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText = "0",
    minuteText = "0",
    secondText = "0",
    fractionText = "",
    zone,
  ] = match;
  const offsetMinutes = _getOffsetMinutesFromZone(zone);
  const wallClockDate = _getUtcDateFromWallClock({
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
    second: Number(secondText),
    milliseconds: Math.floor(Number(`0${fractionText}`) * 1000),
  });
  if (wallClockDate === undefined || offsetMinutes === undefined) {
    return undefined;
  }
  return _getValidDate(wallClockDate.getTime() - offsetMinutes * 60_000);
}

/**
 * Reads a query result cell as a date, for charts that bucket rows by time,
 * such as an epicurve. Accepts a `Date`, an ISO date or timestamp string, and
 * an epoch milliseconds number. Text without a zone is read as UTC, and text
 * with a zone is converted to UTC. Anything else, an impossible calendar date,
 * or a year outside 0000 to 9999 is undefined.
 */
export function getDateFromCellValue(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return _getValidDate(value.getTime());
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? _getValidDate(value) : undefined;
  }
  if (typeof value === "string") {
    return _getDateFromText(value);
  }
  return undefined;
}
