import { FORMAT_TOKEN_ORDER as TOKEN_ORDER } from "@utils/dates/date-utils/formatPatternConstants.ts";
import { parseFormatSegments } from "@utils/dates/date-utils/parseFormatSegments.ts";
import { isDate } from "@utils/guards/isDate/isDate.ts";
import type { FormatToken as Token } from "@utils/dates/date-utils/formatPatternConstants.ts";
import type { LiteralUnion } from "type-fest";

export type FormattableTimezone = LiteralUnion<"local" | "UTC", string>;

const FORMAT_LOCALE = "en-US";

/**
 * Parses `value` the same way `Date` does for numbers, strings, `Date`, and
 * objects with numeric `valueOf` (e.g. Dayjs). Rejects booleans and plain
 * objects that do not coerce to a valid time.
 */
function _coerceToDate(value: unknown): Date | undefined {
  if (
    typeof value === "boolean" ||
    typeof value === "symbol" ||
    typeof value === "function"
  ) {
    return undefined;
  }
  if (typeof value === "bigint") {
    return undefined;
  }
  if (typeof value === "number" || typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  if (isDate(value)) {
    return value;
  }
  if (typeof value === "object" && value !== null) {
    const date = new Date(value as never);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

type ZonedFieldBag = {
  dayPeriodLower: string;
  dayPeriodUpper: string;
  dayOfMonth: number;
  hour12: number;
  hour24: number;
  millisecond: number;
  minute: number;
  month: number;
  monthLong: string;
  monthShort: string;
  offsetIso: string;
  second: number;
  weekdayIndex: number;
  weekdayLong: string;
  weekdayShort: string;
  year: number;
};

function getIntlTimeZone(
  zone: FormattableTimezone | null | undefined,
): string | undefined {
  if (!zone) {
    return "UTC";
  }
  if (zone === "local") {
    return undefined;
  }
  return zone;
}

function buildZonedFieldBag(
  date: Date,
  intlTimeZone: string | undefined,
): ZonedFieldBag {
  const zoneOpts = intlTimeZone === undefined ? {} : { timeZone: intlTimeZone };

  const wall = new Intl.DateTimeFormat(FORMAT_LOCALE, {
    ...zoneOpts,
    day: "numeric",
    hour: "numeric",
    hour12: false,
    minute: "numeric",
    month: "numeric",
    second: "numeric",
    year: "numeric",
  }).formatToParts(date);

  const year = Number(_part(wall, "year"));
  const month = Number(_part(wall, "month"));
  const dayOfMonth = Number(_part(wall, "day"));
  const hour24 = Number(_part(wall, "hour"));
  const minute = Number(_part(wall, "minute"));
  const second = Number(_part(wall, "second"));

  const wall12 = new Intl.DateTimeFormat(FORMAT_LOCALE, {
    ...zoneOpts,
    hour: "numeric",
    hour12: true,
  }).formatToParts(date);

  const hour12 = Number(_part(wall12, "hour"));
  const dayPeriodRaw = _part(wall12, "dayPeriod") ?? "";
  const dayPeriodUpper = dayPeriodRaw.toUpperCase() === "PM" ? "PM" : "AM";
  const dayPeriodLower = dayPeriodUpper === "PM" ? "pm" : "am";

  const monthShort =
    new Intl.DateTimeFormat(FORMAT_LOCALE, {
      ...zoneOpts,
      month: "short",
    })
      .formatToParts(date)
      .find((p) => {
        return p.type === "month";
      })?.value ?? "";

  const monthLong =
    new Intl.DateTimeFormat(FORMAT_LOCALE, {
      ...zoneOpts,
      month: "long",
    })
      .formatToParts(date)
      .find((p) => {
        return p.type === "month";
      })?.value ?? "";

  const weekdayShort =
    new Intl.DateTimeFormat(FORMAT_LOCALE, {
      ...zoneOpts,
      weekday: "short",
    })
      .formatToParts(date)
      .find((p) => {
        return p.type === "weekday";
      })?.value ?? "";

  const weekdayLong =
    new Intl.DateTimeFormat(FORMAT_LOCALE, {
      ...zoneOpts,
      weekday: "long",
    })
      .formatToParts(date)
      .find((p) => {
        return p.type === "weekday";
      })?.value ?? "";

  const weekdayIndex = new Date(
    Date.UTC(year, month - 1, dayOfMonth),
  ).getUTCDay();

  const millisecond = _millisecondRemainder(date);

  const offsetIso = getOffsetIso(date, intlTimeZone);

  return {
    dayOfMonth,
    dayPeriodLower,
    dayPeriodUpper,
    hour12,
    hour24,
    millisecond,
    minute,
    month,
    monthLong,
    monthShort,
    offsetIso,
    second,
    weekdayIndex,
    weekdayLong,
    weekdayShort,
    year,
  };
}

function _part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPart["type"],
): string {
  return (
    parts.find((p) => {
      return p.type === type;
    })?.value ?? ""
  );
}

function _millisecondRemainder(date: Date): number {
  const ms = date.getTime() % 1000;
  return ms < 0 ? ms + 1000 : ms;
}

function getOffsetIso(date: Date, intlTimeZone: string | undefined): string {
  const formatter = new Intl.DateTimeFormat(FORMAT_LOCALE, {
    ...(intlTimeZone === undefined ? {} : { timeZone: intlTimeZone }),
    timeZoneName: "longOffset",
  });
  const raw = formatter.formatToParts(date).find((p) => {
    return p.type === "timeZoneName";
  })?.value;
  return gmtOffsetLabelToIsoOffset(raw);
}

function gmtOffsetLabelToIsoOffset(value: string | undefined): string {
  if (value === undefined || value === "GMT" || value === "UTC") {
    return "+00:00";
  }
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(value);
  if (match) {
    const sign = match[1];
    const hours = (match[2] ?? "").padStart(2, "0");
    const minutes = (match[3] ?? "00").padStart(2, "0");
    return `${sign === "-" ? "-" : "+"}${hours}:${minutes}`;
  }
  return "+00:00";
}

function renderFormat(expandedFormat: string, bag: ZonedFieldBag): string {
  let result = "";
  let index = 0;
  while (index < expandedFormat.length) {
    const token = matchTokenAt(expandedFormat, index);
    if (token) {
      result += emitToken(token, bag);
      index += token.length;
    } else {
      result += expandedFormat[index];
      index++;
    }
  }
  return result;
}

function matchTokenAt(format: string, index: number): Token | undefined {
  const slice = format.slice(index);
  for (const token of TOKEN_ORDER) {
    if (slice.startsWith(token)) {
      return token;
    }
  }
  return undefined;
}

function emitToken(token: Token, bag: ZonedFieldBag): string {
  const msPadded = String(bag.millisecond).padStart(3, "0");
  switch (token) {
    case "M":
      return String(bag.month);
    case "MM":
      return String(bag.month).padStart(2, "0");
    case "MMM":
      return bag.monthShort;
    case "MMMM":
      return bag.monthLong;
    case "YY":
      return String(bag.year).slice(-2);
    case "YYYY":
      return String(bag.year).padStart(4, "0");
    case "D":
      return String(bag.dayOfMonth);
    case "DD":
      return String(bag.dayOfMonth).padStart(2, "0");
    case "d":
      return String(bag.weekdayIndex);
    case "dd":
      return String(bag.weekdayIndex).padStart(2, "0");
    case "ddd":
      return bag.weekdayShort;
    case "dddd":
      return bag.weekdayLong;
    case "H":
      return String(bag.hour24);
    case "HH":
      return String(bag.hour24).padStart(2, "0");
    case "h":
      return String(bag.hour12);
    case "hh":
      return String(bag.hour12).padStart(2, "0");
    case "m":
      return String(bag.minute);
    case "mm":
      return String(bag.minute).padStart(2, "0");
    case "s":
      return String(bag.second);
    case "ss":
      return String(bag.second).padStart(2, "0");
    case "S":
      return msPadded.slice(0, 1);
    case "SS":
      return msPadded.slice(0, 2);
    case "SSS":
      return msPadded;
    case "A":
      return bag.dayPeriodUpper;
    case "a":
      return bag.dayPeriodLower;
    case "Z":
      return bag.offsetIso;
    default: {
      const _exhaustive: never = token;
      return _exhaustive;
    }
  }
}

/**
 * For values that parse into a valid date (determined by `new Date(value)`), we
 * return the date formatted according to the passed `format`. Otherwise, we
 * return `String(value)`.
 *
 * **Format string (moment / dayjs-style):**
 *
 * - **Tokens** (e.g. `YYYY`, `MM`, `HH`, `mm`) are replaced with calendar
 *   fields. See the implementation for the full token list.
 * - **Literal text** that could be mistaken for tokens must be wrapped in
 *   **square brackets** `[` `]`. Example: `MM DD [at] HH:mm` prints the word
 *   `at`; without brackets, `a` is parsed as the `a` (am/pm) token.
 * - **Punctuation and symbols** (`:`, `-`, `/`, `.`, commas, spaces, etc.)
 *   are copied as-is and do not need brackets.
 * - **`L` macros** (`L`, `LL`, …) expand only in unbracketed runs; inside
 *   `[...]`, `L` is literal.
 * - An **unclosed** `[` treats the rest of the pattern as literal text.
 *
 * @param value The value to format.
 * @param options The options to use.
 * @param options.format The format to use. Defaults to ISO 8601.
 * @param options.zone The timezone to use. Defaults to "local", meaning that
 * the local timezone will be used. Otherwise, any valid timezone string can be
 * passed, such as "UTC" or "America/New_York".
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

  const date = _coerceToDate(value);
  if (date === undefined) {
    return String(value);
  }

  const intlTimeZone = getIntlTimeZone(zone);
  const bag = buildZonedFieldBag(date, intlTimeZone);
  return parseFormatSegments(format)
    .map((segment) => {
      if (segment.kind === "literal") {
        return segment.text;
      }
      return renderFormat(segment.text, bag);
    })
    .join("");
}
