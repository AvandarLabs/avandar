import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { describe, expect, it } from "vitest";
import { formatDate } from "./formatDate";

dayjs.extend(utc);
dayjs.extend(timezone);

describe("formatDate", () => {
  const isoDate = "2024-05-10T12:34:56Z";
  const epochMs = 1_705_813_200_000;

  it("returns an empty string for nullish values", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
  });

  it("falls back to String(value) for non-date inputs or invalid strings", () => {
    expect(formatDate({ foo: "bar" })).toBe("[object Object]");
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });

  it("defaults to the local timezone when zone is omitted", () => {
    const expected = dayjs(isoDate)
      .tz(undefined, true)
      .format("YYYY-MM-DDTHH:mm:ssZ");
    expect(formatDate(isoDate)).toBe(expected);
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

  it("accepts existing Dayjs instances", () => {
    const date = dayjs("2024-04-15T08:30:00Z");
    expect(formatDate(date, { zone: "UTC" })).toBe(
      "2024-04-15T08:30:00+00:00",
    );
  });

  it("supports custom format tokens", () => {
    expect(
      formatDate("2024-01-21T05:00:00Z", {
        format: "MMM DD, YYYY",
        zone: "UTC",
      }),
    ).toBe("Jan 21, 2024");
  });
});
