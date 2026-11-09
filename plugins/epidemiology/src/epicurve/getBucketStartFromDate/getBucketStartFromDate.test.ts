import { describe, expect, it } from "vitest";
import { getBucketStartFromDate } from "./getBucketStartFromDate";
import type { EpicurveInterval } from "./getBucketStartFromDate";

function _getBucketStart(isoText: string, interval: EpicurveInterval): string {
  return getBucketStartFromDate({ date: new Date(isoText), interval });
}

describe("getBucketStartFromDate", () => {
  it("returns the UTC calendar day for the day interval", () => {
    expect(_getBucketStart("2021-01-02T23:30:00.000Z", "day")).toBe(
      "2021-01-02",
    );
  });

  it("uses the UTC day even where the local day differs", () => {
    // 02:00 UTC on 3 January is still 2 January west of Greenwich.
    expect(_getBucketStart("2021-01-03T02:00:00.000Z", "day")).toBe(
      "2021-01-03",
    );
  });

  it("starts an epi week on the Sunday before a midweek date", () => {
    expect(_getBucketStart("2021-01-13T12:00:00.000Z", "epiWeek")).toBe(
      "2021-01-10",
    );
  });

  it("starts an epi week on a Sunday's own date", () => {
    expect(_getBucketStart("2021-01-10T00:00:00.000Z", "epiWeek")).toBe(
      "2021-01-10",
    );
  });

  it("puts Thursday 2020-12-31 in MMWR week 53 of 2020, from 2020-12-27", () => {
    expect(_getBucketStart("2020-12-31T12:00:00.000Z", "epiWeek")).toBe(
      "2020-12-27",
    );
  });

  it("puts Saturday 2021-01-02 in MMWR week 53 of 2020, from 2020-12-27", () => {
    expect(_getBucketStart("2021-01-02T23:59:59.999Z", "epiWeek")).toBe(
      "2020-12-27",
    );
  });

  it("starts MMWR week 1 of 2021 on Sunday 2021-01-03", () => {
    expect(_getBucketStart("2021-01-03T00:00:00.000Z", "epiWeek")).toBe(
      "2021-01-03",
    );
  });

  it("returns the first of the month for the month interval", () => {
    expect(_getBucketStart("2021-01-31T23:00:00.000Z", "month")).toBe(
      "2021-01-01",
    );
  });

  it("returns 1 February for the leap day 2020-02-29", () => {
    expect(_getBucketStart("2020-02-29T12:00:00.000Z", "month")).toBe(
      "2020-02-01",
    );
  });

  it("pads a year before 1000 to four digits", () => {
    expect(_getBucketStart("0999-06-15T00:00:00.000Z", "day")).toBe(
      "0999-06-15",
    );
  });
});
