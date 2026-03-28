/** English month names for `MMM` / `MMMM` parsing (case-insensitive). */
export const MONTH_SHORT_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const MONTH_LONG_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function monthShortRegexSource(): string {
  return MONTH_SHORT_NAMES.join("|");
}

export function monthLongRegexSource(): string {
  return MONTH_LONG_NAMES.join("|");
}

export function monthShortIndex(name: string): number | undefined {
  const i = MONTH_SHORT_NAMES.findIndex((m) => {
    return m.toLowerCase() === name.toLowerCase();
  });
  return i === -1 ? undefined : i + 1;
}

export function monthLongIndex(name: string): number | undefined {
  const i = MONTH_LONG_NAMES.findIndex((m) => {
    return m.toLowerCase() === name.toLowerCase();
  });
  return i === -1 ? undefined : i + 1;
}
