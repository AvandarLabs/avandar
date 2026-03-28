import { formatDate } from "@utils/dates/formatDate/formatDate.ts";
import { parseDate } from "@utils/dates/parseDate/parseDate.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("formatDate", () => {
  const isoDate = "2024-05-10T12:34:56Z";
  const epochMs = 1_705_813_200_000;
  /** Fixed instant with non-zero milliseconds for S / SS / SSS. */
  const sample = "2024-06-15T14:05:07.123Z";

  beforeEach(() => {
    vi.stubEnv("TZ", "UTC");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns an empty string for nullish values", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
  });

  it("falls back to String(value) for non-date inputs or invalid strings", () => {
    expect(formatDate({ foo: "bar" })).toBe("[object Object]");
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });

  it("defaults to the local timezone when zone is omitted", () => {
    expect(formatDate(isoDate)).toBe("2024-05-10T12:34:56+00:00");
  });

  it("respects explicit timezone inputs", () => {
    expect(
      formatDate("2024-01-21T05:00:00Z", { zone: "America/New_York" }),
    ).toBe("2024-01-21T00:00:00-05:00");
  });

  it("formats epoch millisecond values", () => {
    expect(formatDate(epochMs, { zone: "UTC" })).toBe(
      "2024-01-21T05:00:00+00:00",
    );
  });

  it("accepts objects that coerce through Date (e.g. Dayjs-like valueOf)", () => {
    const date = new Date("2024-04-15T08:30:00Z");
    expect(formatDate(date, { zone: "UTC" })).toBe("2024-04-15T08:30:00+00:00");
  });

  it("supports custom format tokens", () => {
    expect(
      formatDate("2024-01-21T05:00:00Z", {
        format: "MMM DD, YYYY",
        zone: "UTC",
      }),
    ).toBe("Jan 21, 2024");
  });

  it("uses UTC when zone is falsy", () => {
    expect(
      formatDate("2024-01-21T05:00:00Z", {
        zone: null as unknown as undefined,
      }),
    ).toBe("2024-01-21T05:00:00+00:00");
  });

  it("formats the default ISO-like pattern", () => {
    expect(formatDate(sample, { zone: "UTC" })).toBe(
      "2024-06-15T14:05:07+00:00",
    );
  });

  it("formats month tokens (M, MM, MMM, MMMM)", () => {
    const z = { zone: "UTC" as const };
    expect(formatDate(sample, { ...z, format: "M" })).toBe("6");
    expect(formatDate(sample, { ...z, format: "MM" })).toBe("06");
    expect(formatDate(sample, { ...z, format: "MMM" })).toBe("Jun");
    expect(formatDate(sample, { ...z, format: "MMMM" })).toBe("June");
  });

  it("formats year tokens (YY, YYYY)", () => {
    const z = { zone: "UTC" as const };
    expect(formatDate(sample, { ...z, format: "YY" })).toBe("24");
    expect(formatDate(sample, { ...z, format: "YYYY" })).toBe("2024");
  });

  it("formats day-of-month tokens (D, DD)", () => {
    const z = { zone: "UTC" as const };
    expect(formatDate(sample, { ...z, format: "D" })).toBe("15");
    expect(formatDate(sample, { ...z, format: "DD" })).toBe("15");
    expect(formatDate("2024-06-05T14:05:07Z", { ...z, format: "D- DD" })).toBe(
      "5- 05",
    );
  });

  it("formats weekday tokens (d, dd, ddd, dddd)", () => {
    const z = { zone: "UTC" as const };
    expect(formatDate(sample, { ...z, format: "d" })).toBe("6");
    expect(formatDate(sample, { ...z, format: "dd" })).toBe("06");
    expect(formatDate(sample, { ...z, format: "ddd" })).toBe("Sat");
    expect(formatDate(sample, { ...z, format: "dddd" })).toBe("Saturday");
  });

  it("formats 24-hour tokens (H, HH)", () => {
    const z = { zone: "UTC" as const };
    expect(formatDate(sample, { ...z, format: "H" })).toBe("14");
    expect(formatDate(sample, { ...z, format: "HH" })).toBe("14");
    expect(formatDate("2024-06-15T05:05:07Z", { ...z, format: "H|HH" })).toBe(
      "5|05",
    );
  });

  it("formats 12-hour tokens (h, hh) and day periods (A, a)", () => {
    const z = { zone: "UTC" as const };
    expect(formatDate(sample, { ...z, format: "h A a" })).toBe("2 PM pm");
    expect(formatDate(sample, { ...z, format: "hh" })).toBe("02");
    expect(formatDate("2024-06-15T00:05:07Z", { ...z, format: "h A" })).toBe(
      "12 AM",
    );
    expect(formatDate("2024-06-15T12:00:00Z", { ...z, format: "h A" })).toBe(
      "12 PM",
    );
  });

  it("formats minute and second tokens (m, mm, s, ss)", () => {
    const z = { zone: "UTC" as const };
    expect(formatDate(sample, { ...z, format: "m|mm" })).toBe("5|05");
    expect(formatDate(sample, { ...z, format: "s|ss" })).toBe("7|07");
  });

  it("formats fractional second tokens (S, SS, SSS)", () => {
    const z = { zone: "UTC" as const };
    expect(formatDate(sample, { ...z, format: "S-SS-SSS" })).toBe("1-12-123");
    expect(
      formatDate("2024-06-15T14:05:07.045Z", { ...z, format: "S-SS-SSS" }),
    ).toBe("0-04-045");
  });

  it("formats Z as a numeric offset like +00:00", () => {
    expect(formatDate(sample, { zone: "UTC", format: "Z" })).toBe("+00:00");
    expect(formatDate(sample, { zone: "America/New_York", format: "Z" })).toBe(
      "-04:00",
    );
    expect(formatDate(sample, { zone: "Asia/Kolkata", format: "Z" })).toBe(
      "+05:30",
    );
  });

  it("expands L macros", () => {
    const z = { zone: "UTC" as const };
    expect(formatDate(sample, { ...z, format: "L" })).toBe("06/15/2024");
    expect(formatDate(sample, { ...z, format: "LL" })).toBe("June 15, 2024");
    expect(formatDate(sample, { ...z, format: "LLL" })).toBe(
      "June 15, 2024 2:05 PM",
    );
    expect(formatDate(sample, { ...z, format: "LLLL" })).toBe(
      "Saturday, June 15, 2024 2:05 PM",
    );
  });

  it("does not expand L inside bracket literals", () => {
    expect(formatDate(sample, { zone: "UTC", format: "[L]MM" })).toBe("L06");
  });

  it("treats bracket pairs as literal text", () => {
    expect(
      formatDate(sample, { zone: "UTC", format: "[Hello ]YYYY[ world]" }),
    ).toBe("Hello 2024 world");
  });

  it("copies slashes, dashes, colons, and other punctuation without escaping", () => {
    const z = { zone: "UTC" as const };
    expect(formatDate(sample, { ...z, format: "MM/DD/YYYY" })).toBe(
      "06/15/2024",
    );
    expect(formatDate(sample, { ...z, format: "MM-DD-YYYY HH:mm:ss" })).toBe(
      "06-15-2024 14:05:07",
    );
    expect(formatDate(sample, { ...z, format: "YYYY-MM-DDTHH:mm:ss" })).toBe(
      "2024-06-15T14:05:07",
    );
    expect(
      formatDate(sample, { ...z, format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    ).toBe("2024-06-15 14:05:07.123");
    expect(formatDate(sample, { ...z, format: "MM.DD.YYYY @ HH:mm" })).toBe(
      "06.15.2024 @ 14:05",
    );
    expect(formatDate(sample, { ...z, format: "YYYY/MM/DD—HH:mm" })).toBe(
      "2024/06/15—14:05",
    );
  });

  it("copies period separators in date and time parts", () => {
    const z = { zone: "UTC" as const };
    expect(formatDate(sample, { ...z, format: "DD.MM.YYYY" })).toBe(
      "15.06.2024",
    );
    expect(formatDate(sample, { ...z, format: "HH.mm.ss" })).toBe("14.05.07");
  });

  it("uses square brackets for literal words that contain token letters", () => {
    const z = { zone: "UTC" as const };
    expect(formatDate(sample, { ...z, format: "MM DD [at] HH:mm" })).toBe(
      "06 15 at 14:05",
    );
  });

  it("parses bare letters that match tokens as tokens (use brackets for words)", () => {
    const z = { zone: "UTC" as const };
    expect(formatDate(sample, { ...z, format: "MM DD at HH:mm" })).toBe(
      "06 15 pmt 14:05",
    );
  });

  it("formats an unclosed bracket as literal from [ to end", () => {
    expect(formatDate(sample, { zone: "UTC", format: "YYYY[unclosed" })).toBe(
      "2024unclosed",
    );
  });

  it("applies timezone to all calendar fields consistently", () => {
    expect(
      formatDate(sample, {
        zone: "America/New_York",
        format: "YYYY-MM-DD HH:mm:ss Z",
      }),
    ).toBe("2024-06-15 10:05:07 -04:00");
  });
});

describe("parseDate integration with formatDate tokens", () => {
  /** No sub-second field in default `formatDate` output for round-trip. */
  const roundTripInstant = "2024-06-15T14:05:07.000Z";

  beforeEach(() => {
    vi.stubEnv("TZ", "UTC");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips default ISO-like format from formatDate (UTC)", () => {
    const formatted = formatDate(roundTripInstant, { zone: "UTC" });
    const parsed = parseDate(formatted, {
      format: "YYYY-MM-DDTHH:mm:ssZ",
    });
    expect(parsed?.toISOString()).toBe(
      new Date(roundTripInstant).toISOString(),
    );
  });

  it("round-trips MM/DD/YYYY HH:mm:ss", () => {
    const fmt = "MM/DD/YYYY HH:mm:ss";
    const formatted = formatDate(roundTripInstant, {
      zone: "UTC",
      format: fmt,
    });
    const parsed = parseDate(formatted, { format: fmt });
    expect(parsed?.toISOString()).toBe(
      new Date(roundTripInstant).toISOString(),
    );
  });

  it("parses dash-separated datetime via fallback when Date.parse fails", () => {
    expect(parseDate("2024-06-15-14-05-07")?.toISOString()).toBe(
      "2024-06-15T14:05:07.000Z",
    );
  });

  it("parses milliseconds with SSS in explicit format", () => {
    const parsed = parseDate("2024-06-15 14:05:07.456", {
      format: "YYYY-MM-DD HH:mm:ss.SSS",
    });
    expect(parsed?.toISOString()).toBe("2024-06-15T14:05:07.456Z");
  });
});
