import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeDataGridColumnDefs } from "@/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs";

/** Midnight on 2022-01-01, as DuckDB returns a DATE or a month bucket. */
const JAN_1_2022 = Date.UTC(2022, 0, 1);
const FEB_1_2022 = Date.UTC(2022, 1, 1);
const MAR_5_2022_AT_1430 = Date.UTC(2022, 2, 5, 14, 30);

function _formatCell(
  options: Readonly<{
    data: Array<Record<string, unknown>>;
    field: string;
    value: unknown;
    dateFormat?: string;
  }>,
): string {
  const columnDefs = makeDataGridColumnDefs({
    columnNames: Object.keys(options.data[0] ?? {}),
    data: options.data,
    dateColumns: new Set([options.field]),
    dateFormat: options.dateFormat ?? "YYYY-MM-DD HH:mm:ss",
  });
  const columnDef = columnDefs.find((def) => {
    return def.field === options.field;
  });
  return columnDef!.valueFormatter({ value: options.value });
}

describe("makeDataGridColumnDefs", () => {
  const originalTimezone = process.env.TZ;

  beforeAll(() => {
    // A user west of UTC is where a zone-less date used to slip a day back.
    process.env.TZ = "America/New_York";
  });

  afterAll(() => {
    process.env.TZ = originalTimezone;
  });

  it("shows a zone-less date on its own calendar day, not the day before", () => {
    const data = [{ month: JAN_1_2022 }, { month: FEB_1_2022 }];
    expect(_formatCell({ data, field: "month", value: JAN_1_2022 })).toBe(
      "2022-01-01",
    );
  });

  it("keeps the time of day when a column holds times other than midnight", () => {
    const data = [{ seen_at: JAN_1_2022 }, { seen_at: MAR_5_2022_AT_1430 }];
    expect(
      _formatCell({ data, field: "seen_at", value: MAR_5_2022_AT_1430 }),
    ).toBe("2022-03-05 14:30:00");
    expect(_formatCell({ data, field: "seen_at", value: JAN_1_2022 })).toBe(
      "2022-01-01 00:00:00",
    );
  });

  it("shows date text on the day and time it names", () => {
    const data = [{ day: "2022-01-01" }, { day: "2022-01-02" }];
    expect(_formatCell({ data, field: "day", value: "2022-01-01" })).toBe(
      "2022-01-01",
    );
    const timedData = [{ seen_at: "2022-03-05 14:30:00" }];
    expect(
      _formatCell({
        data: timedData,
        field: "seen_at",
        value: "2022-03-05 14:30:00",
      }),
    ).toBe("2022-03-05 14:30:00");
  });

  it("formats numbers and blanks in non-date columns", () => {
    const columnDefs = makeDataGridColumnDefs({
      columnNames: ["state", "deaths"],
      data: [{ state: "Texas", deaths: 12 }],
      dateColumns: new Set(),
      dateFormat: "YYYY-MM-DD",
    });
    expect(columnDefs[0]!.valueFormatter({ value: null })).toBe("");
    expect(columnDefs[0]!.valueFormatter({ value: "Texas" })).toBe("Texas");
    expect(columnDefs[1]!.valueFormatter({ value: 12 })).toBe("12");
  });

  it("shows whole-number counts without decimals and fractions with two", () => {
    const columnDefs = makeDataGridColumnDefs({
      columnNames: ["total_deaths", "Lat"],
      data: [{ total_deaths: 63_437, Lat: 32.53952745 }],
      dateColumns: new Set(),
      dateFormat: "YYYY-MM-DD",
    });
    expect(columnDefs[0]!.valueFormatter({ value: 63_437 })).toBe("63,437");
    expect(columnDefs[0]!.valueFormatter({ value: 1_123_836 })).toBe(
      "1,123,836",
    );
    expect(columnDefs[1]!.valueFormatter({ value: 32.53952745 })).toBe("32.54");
  });

  it("groups the digits of a count whose column name ends in year", () => {
    const [columnDef] = makeDataGridColumnDefs({
      columnNames: ["total_deaths_last_year"],
      data: [],
      dateColumns: new Set(),
      dateFormat: "YYYY-MM-DD",
    });
    expect(columnDef!.valueFormatter({ value: 267_296 })).toBe("267,296");
  });

  it("shows years, ids, and codes as plain digits", () => {
    const columnNames = ["year", "UID", "FIPS", "code3", "fiscal_year"];
    const columnDefs = makeDataGridColumnDefs({
      columnNames,
      data: [],
      dateColumns: new Set(),
      dateFormat: "YYYY-MM-DD",
    });
    const values = [2020, 84_001_001, 1001, 840, 2021];
    expect(
      columnDefs.map((columnDef, index) => {
        return columnDef.valueFormatter({ value: values[index] });
      }),
    ).toEqual(["2020", "84001001", "1001", "840", "2021"]);
  });

  describe("a list cell", () => {
    function _formatListCell(value: unknown): string {
      const [columnDef] = makeDataGridColumnDefs({
        columnNames: ["Daily new cases"],
        data: [{ "Daily new cases": value }],
        dateColumns: undefined,
        dateFormat: "YYYY-MM-DD",
      });
      return columnDef!.valueFormatter({ value });
    }

    it("shows its numbers separated by semicolons", () => {
      expect(_formatListCell([31, 1234])).toBe("31; 1,234");
    });

    it("shows its text items separated by semicolons", () => {
      expect(_formatListCell(["Fever", "Cough"])).toBe("Fever; Cough");
    });

    it("shows an empty list as blank", () => {
      expect(_formatListCell([])).toBe("");
    });

    it("leaves a NULL item out instead of showing a stray separator", () => {
      expect(_formatListCell([null, "Cough"])).toBe("Cough");
    });

    it("flattens a nested list into one run of values", () => {
      expect(_formatListCell([[1, 2], [3]])).toBe("1; 2; 3");
    });
  });
});
