import { isDate } from "$/lib/utils/guards/isDate/isDate.ts";
import dayjs from "dayjs";
// eslint-disable-next-line import-x/extensions
import timezone from "dayjs/plugin/timezone";
// eslint-disable-next-line import-x/extensions
import utc from "dayjs/plugin/utc";
import type { LiteralUnion } from "type-fest";

dayjs.extend(utc);
dayjs.extend(timezone);

export type FormattableTimezone = LiteralUnion<"local" | "UTC", string>;

/**
 * For values that parse into a valid date (deterined by just passing directly
 * into `dayjs()`), we will return the date formatted according to the
 * passed `format`. Otherwise, we just return `String(value)`.
 *
 * @param value The value to format.
 * @param options The options to use.
 * @param options.format The format to use. Defaults to ISO 8601.
 * @param options.zone The timezone to use. Defaults to "local", meaning that
 * the local timezone will be used, as determined by `dayjs`. Otherwise, any
 * valid timezone string can be passed, such as "UTC" or "America/New_York".
 * @returns The formatted date.
 */
export function formatDate(
  value: unknown,
  {
    zone = "local",
    format = "YYYY-MM-DDTHH:mm:ssZ",
  }: {
    zone?: FormattableTimezone;
    format?: string;
  } = {},
): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (
    typeof value !== "number" &&
    typeof value !== "string" &&
    !isDate(value) &&
    !dayjs.isDayjs(value)
  ) {
    return String(value);
  }

  const date = dayjs.isDayjs(value) ? value : dayjs(value);
  if (!date.isValid()) {
    return String(value);
  }

  const dateWithTimezone =
    zone ?
      date.tz(zone === "local" ? undefined : zone, zone === "local")
    : date.utc();
  return dateWithTimezone.format(format);
}
