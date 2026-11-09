import { describe, expect, it } from "vitest";
import { getDateFromCellValue } from "./getDateFromCellValue";

function _getIsoText(value: unknown): string | undefined {
  return getDateFromCellValue(value)?.toISOString();
}

describe("getDateFromCellValue", () => {
  it("reads a Date as the same instant", () => {
    expect(_getIsoText(new Date("2021-01-03T10:15:00.000Z"))).toBe(
      "2021-01-03T10:15:00.000Z",
    );
  });

  it("reads an ISO date string as midnight UTC", () => {
    expect(_getIsoText("2021-01-03")).toBe("2021-01-03T00:00:00.000Z");
  });

  it("reads a timestamp string without a zone as UTC", () => {
    expect(_getIsoText("2021-01-02 23:30:00")).toBe("2021-01-02T23:30:00.000Z");
  });

  it("keeps the fraction of a second in a timestamp string", () => {
    expect(_getIsoText("2021-01-02T23:30:15.250")).toBe(
      "2021-01-02T23:30:15.250Z",
    );
  });

  it("converts a timestamp string with a zone offset to UTC", () => {
    expect(_getIsoText("2021-01-02T23:30:00-05:00")).toBe(
      "2021-01-03T04:30:00.000Z",
    );
  });

  it("reads a timestamp string that ends in Z as UTC", () => {
    expect(_getIsoText("2021-01-02T23:30:00Z")).toBe(
      "2021-01-02T23:30:00.000Z",
    );
  });

  it("reads an epoch milliseconds number as that instant", () => {
    expect(_getIsoText(Date.UTC(2021, 0, 3))).toBe("2021-01-03T00:00:00.000Z");
  });

  it("ignores whitespace around a date string", () => {
    expect(_getIsoText("  2021-01-03 ")).toBe("2021-01-03T00:00:00.000Z");
  });

  it("keeps a year below 100 as written", () => {
    expect(_getIsoText("0099-01-01")).toBe("0099-01-01T00:00:00.000Z");
  });

  it("returns undefined for an invalid Date", () => {
    expect(getDateFromCellValue(new Date("not a date"))).toBeUndefined();
  });

  it("returns undefined for a calendar day that does not exist", () => {
    expect(getDateFromCellValue("2021-02-30")).toBeUndefined();
    expect(getDateFromCellValue("2021-13-01")).toBeUndefined();
  });

  it("returns undefined for a time of day that does not exist", () => {
    expect(getDateFromCellValue("2021-01-02 24:00:00")).toBeUndefined();
    expect(getDateFromCellValue("2021-01-02 10:60:00")).toBeUndefined();
  });

  it("returns undefined for text that is not an ISO date", () => {
    expect(getDateFromCellValue("")).toBeUndefined();
    expect(getDateFromCellValue("n/a")).toBeUndefined();
    expect(getDateFromCellValue("01/03/2021")).toBeUndefined();
  });

  it("returns undefined for a number that is not finite", () => {
    expect(getDateFromCellValue(Number.NaN)).toBeUndefined();
    expect(getDateFromCellValue(Number.POSITIVE_INFINITY)).toBeUndefined();
  });

  it("returns undefined for a year past 9999", () => {
    expect(getDateFromCellValue(Date.UTC(10_000, 0, 1))).toBeUndefined();
  });

  it("returns undefined for values that are not dates, text, or numbers", () => {
    expect(getDateFromCellValue(null)).toBeUndefined();
    expect(getDateFromCellValue(undefined)).toBeUndefined();
    expect(getDateFromCellValue(true)).toBeUndefined();
    expect(getDateFromCellValue(1_609_632_000_000n)).toBeUndefined();
  });
});
