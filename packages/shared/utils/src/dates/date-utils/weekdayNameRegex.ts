/** English weekday names for `ddd` / `dddd` parsing (case-insensitive). */
export const WEEKDAY_SHORT_NAMES = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export const WEEKDAY_LONG_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function weekdayShortRegexSource(): string {
  return WEEKDAY_SHORT_NAMES.join("|");
}

export function weekdayLongRegexSource(): string {
  return WEEKDAY_LONG_NAMES.join("|");
}
