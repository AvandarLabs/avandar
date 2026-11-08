/**
 * A field's value reads by its type, the same for every reader whatever
 * their time zone, and never as the raw number DuckDB returns for a date.
 */
import * as arrow from "apache-arrow";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { arrowTableToJS } from "@/clients/DuckDbClient/duckDbArrowResults/duckDbArrowResults";
import { createFieldValueFormatter } from "@/components/caseFields/createFieldValueFormatter/createFieldValueFormatter";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";

function _format(dataType: AvaDataType.T, value: unknown): string {
  return createFieldValueFormatter({ dataType, locale: "en" })(value);
}

/** Runs one Arrow column through `arrowTableToJS` and returns its one value. */
function _readArrowValue(vector: arrow.Vector): unknown {
  return _readColumnValue({ columnName: "value", vector });
}

function _readColumnValue(
  options: Readonly<{ columnName: string; vector: arrow.Vector }>,
): unknown {
  const table: arrow.Table<Record<string, arrow.DataType>> = new arrow.Table({
    [options.columnName]: options.vector,
  });
  return arrowTableToJS(table).data[0]?.[options.columnName];
}

describe("createFieldValueFormatter", () => {
  const originalTimezone = process.env.TZ;

  beforeAll(() => {
    // West of UTC is where a UTC-midnight date slips to the day before.
    process.env.TZ = "America/Los_Angeles";
  });

  afterAll(() => {
    process.env.TZ = originalTimezone;
  });

  it.each([
    ["date", 1_709_596_800_000, "Mar 5, 2024"],
    ["date", "2026-01-05", "Jan 5, 2026"],
    ["timestamp", Date.UTC(2026, 0, 5, 10, 30), "Jan 5, 2026, 10:30 AM"],
    ["timestamp", "2026-01-05T10:30:00.000Z", "Jan 5, 2026, 10:30 AM"],
    ["time", 52_200_000_000, "2:30 PM"],
    ["bigint", 1_234_567, "1,234,567"],
    ["double", 38.456, "38.456"],
    ["varchar", "Alameda", "Alameda"],
    ["boolean", true, "true"],
  ] as const)("reads a %s value %s as %s", (dataType, value, expected) => {
    expect(_format(dataType, value)).toBe(expected);
  });

  it("reads a missing value as empty", () => {
    expect(_format("date", null)).toBe("");
    expect(_format("varchar", undefined)).toBe("");
  });

  // A time can arrive as text from another path; it already reads well.
  it("leaves a value of the wrong kind as it is", () => {
    expect(_format("time", "14:30:00")).toBe("14:30:00");
    expect(_format("date", "not a date")).toBe("not a date");
  });

  it("reads a negative or fractional number with the locale's grouping", () => {
    expect(_format("bigint", -1_234_567)).toBe("-1,234,567");
    expect(
      createFieldValueFormatter({ dataType: "double", locale: "de" })(1234.5),
    ).toBe("1.234,5");
  });

  // What the record page receives is whatever `arrowTableToJS` returns, so
  // each case here starts from a real Arrow column.
  describe("a value as arrowTableToJS returns it", () => {
    it("reads a DATE as the day it holds", () => {
      const dates = arrow.vectorFromArray(
        [new Date("2024-03-05T00:00:00Z")],
        new arrow.DateDay(),
      );

      expect(_format("date", _readArrowValue(dates))).toBe("Mar 5, 2024");
    });

    it("reads a TIMESTAMP as the instant it holds, in UTC", () => {
      const timestamps = arrow.vectorFromArray(
        [Date.UTC(2026, 0, 5, 10, 30)],
        new arrow.TimestampMillisecond(),
      );

      expect(_format("timestamp", _readArrowValue(timestamps))).toBe(
        "Jan 5, 2026, 10:30 AM",
      );
    });

    it("reads a TIME as the clock time it holds", () => {
      const times = arrow.vectorFromArray(
        [52_200_000_000n],
        new arrow.TimeMicrosecond(),
      );

      expect(_format("time", _readArrowValue(times))).toBe("2:30 PM");
    });

    it("reads a BIGINT with grouping", () => {
      const counts = arrow.vectorFromArray([1_234_567n], new arrow.Int64());

      expect(_format("bigint", _readArrowValue(counts))).toBe("1,234,567");
    });

    it("reads a DOUBLE as its number", () => {
      const rates = arrow.vectorFromArray([38.456], new arrow.Float64());

      expect(_format("double", _readArrowValue(rates))).toBe("38.456");
    });

    it("reads a DECIMAL with its scale applied", () => {
      const prices = arrow.makeVector(
        arrow.makeData({
          type: new arrow.Decimal(2, 6, 128),
          length: 1,
          nullCount: 0,
          data: new Uint32Array([123_456, 0, 0, 0]),
        }),
      );

      expect(_format("double", _readArrowValue(prices))).toBe("1,234.56");
    });

    it("reads a BOOLEAN and a VARCHAR as they are", () => {
      const flags = arrow.vectorFromArray([true], new arrow.Bool());
      const names = arrow.vectorFromArray(["Alameda"], new arrow.Utf8());

      expect(_format("boolean", _readArrowValue(flags))).toBe("true");
      expect(_format("varchar", _readArrowValue(names))).toBe("Alameda");
    });
  });
});
