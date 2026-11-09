import { describe, expect, it } from "vitest";
import { makeWideResultFromLongResult } from "@/components/VisualizationContainer/makeWideResultFromLongResult/makeWideResultFromLongResult";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { UnknownDataFrame } from "@avandar/utils";

const COLUMNS: readonly QueryResult.Column[] = [
  { name: "week", dataType: "date" },
  { name: "district", dataType: "varchar" },
  { name: "cases", dataType: "bigint" },
];

const DATE_COLUMNS: ReadonlySet<string> = new Set(["week"]);

function _split(
  data: UnknownDataFrame,
  columns: readonly QueryResult.Column[] = COLUMNS,
) {
  return makeWideResultFromLongResult({
    columns,
    data,
    dateColumns: DATE_COLUMNS,
    xColumnName: "week",
    valueColumnName: "cases",
    otherLabel: "Other",
    blankLabel: "(Blank)",
  });
}

function _getWeeks(result: { data: UnknownDataFrame }): unknown[] {
  return result.data.map((row) => {
    return row.week;
  });
}

const JAN_1_MS = Date.UTC(2024, 0, 1);
const JAN_8_MS = Date.UTC(2024, 0, 8);
const JAN_15_MS = Date.UTC(2024, 0, 15);

describe("makeWideResultFromLongResult", () => {
  it("gives one series column per district", () => {
    const result = _split([
      { week: "2024-01-01", district: "North", cases: 5 },
      { week: "2024-01-01", district: "South", cases: 3 },
      { week: "2024-01-01", district: "East", cases: 1 },
      { week: "2024-01-08", district: "North", cases: 7 },
      { week: "2024-01-08", district: "South", cases: 2 },
      { week: "2024-01-08", district: "East", cases: 4 },
    ]);

    expect(result.isSplit && result.seriesColumnNames).toEqual([
      "North",
      "South",
      "East",
    ]);
    expect(result.data).toEqual([
      { week: "2024-01-01", North: 5, South: 3, East: 1 },
      { week: "2024-01-08", North: 7, South: 2, East: 4 },
    ]);
  });

  it("keeps the top 8 districts and sums the rest into Other", () => {
    const districts = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    const data = districts.flatMap((district, index) => {
      return [
        { week: "2024-01-01", district, cases: 100 - index },
        { week: "2024-01-08", district, cases: 50 - index },
      ];
    });

    const result = _split(data);

    expect(result.isSplit && result.seriesColumnNames).toEqual([
      ..."ABCDEFGH",
      "Other",
    ]);
    expect(result.data[0]).toMatchObject({ A: 100, H: 93, Other: 91 + 92 });
    expect(result.data[1]).toMatchObject({ A: 50, H: 43, Other: 41 + 42 });
  });

  it("leaves null where a district has no row for a week", () => {
    const result = _split([
      { week: "2024-01-01", district: "North", cases: 5 },
      { week: "2024-01-01", district: "South", cases: 3 },
      { week: "2024-01-08", district: "North", cases: 7 },
    ]);

    expect(result.data[1]).toEqual({
      week: "2024-01-08",
      North: 7,
      South: null,
    });
  });

  it("orders date x values ascending when the rows are out of order", () => {
    const result = _split([
      { week: "2024-01-15", district: "North", cases: 1 },
      { week: "2024-01-01", district: "South", cases: 2 },
      { week: "2024-01-08", district: "North", cases: 3 },
    ]);

    expect(
      result.data.map((row) => {
        return row.week;
      }),
    ).toEqual(["2024-01-01", "2024-01-08", "2024-01-15"]);
  });

  it("keeps the result's order for text x values", () => {
    const result = makeWideResultFromLongResult({
      columns: [
        { name: "quarter", dataType: "varchar" },
        { name: "district", dataType: "varchar" },
        { name: "cases", dataType: "double" },
      ],
      data: [
        { quarter: "Q3", district: "North", cases: 1 },
        { quarter: "Q1", district: "South", cases: 2 },
      ],
      dateColumns: new Set(),
      xColumnName: "quarter",
      valueColumnName: "cases",
      otherLabel: "Other",
      blankLabel: "(Blank)",
    });

    expect(
      result.data.map((row) => {
        return row.quarter;
      }),
    ).toEqual(["Q3", "Q1"]);
  });

  it("returns the input unchanged when there is a single district", () => {
    const data = [
      { week: "2024-01-01", district: "North", cases: 5 },
      { week: "2024-01-08", district: "North", cases: 7 },
    ];

    const result = _split(data);

    expect(result).toEqual({ isSplit: false, data });
    expect(result.data).toBe(data);
  });

  it("returns the input unchanged when there are two category columns", () => {
    const data = [
      { week: "2024-01-01", district: "North", state: "TX", cases: 5 },
      { week: "2024-01-01", district: "South", state: "CA", cases: 3 },
    ];

    const result = _split(data, [
      ...COLUMNS,
      { name: "state", dataType: "varchar" },
    ]);

    expect(result).toEqual({ isSplit: false, data });
  });

  it("returns the input unchanged when the value column is not numeric", () => {
    const data = [
      { week: "2024-01-01", district: "North", cases: "five" },
      { week: "2024-01-01", district: "South", cases: "three" },
    ];

    const result = _split(data, [
      COLUMNS[0]!,
      COLUMNS[1]!,
      { name: "cases", dataType: "varchar" },
    ]);

    expect(result).toEqual({ isSplit: false, data });
  });

  it("ignores numeric columns the chart does not draw", () => {
    const result = _split(
      [
        { week: "2024-01-01", district: "North", cases: 5, deaths: 1 },
        { week: "2024-01-01", district: "South", cases: 3, deaths: 0 },
      ],
      [...COLUMNS, { name: "deaths", dataType: "bigint" }],
    );

    expect(result.data).toEqual([{ week: "2024-01-01", North: 5, South: 3 }]);
  });

  it("groups and sorts epoch-millisecond dates oldest first", () => {
    const result = _split([
      { week: JAN_15_MS, district: "North", cases: 1 },
      { week: JAN_1_MS, district: "North", cases: 2 },
      { week: JAN_15_MS, district: "South", cases: 3 },
      { week: JAN_8_MS, district: "South", cases: 4 },
    ]);

    expect(result.data).toEqual([
      { week: JAN_1_MS, North: 2, South: null },
      { week: JAN_8_MS, North: null, South: 4 },
      { week: JAN_15_MS, North: 1, South: 3 },
    ]);
  });

  it("groups equal Date objects into one row, oldest first", () => {
    const result = _split([
      { week: new Date(JAN_8_MS), district: "North", cases: 1 },
      { week: new Date(JAN_1_MS), district: "North", cases: 2 },
      { week: new Date(JAN_8_MS), district: "South", cases: 3 },
    ]);

    expect(result.data).toEqual([
      { week: new Date(JAN_1_MS), North: 2, South: null },
      { week: new Date(JAN_8_MS), North: 1, South: 3 },
    ]);
  });

  it("sums rows with no district into Other", () => {
    const result = _split([
      { week: "2024-01-01", district: "North", cases: 5 },
      { week: "2024-01-01", district: "South", cases: 3 },
      { week: "2024-01-01", district: null, cases: 2 },
    ]);

    expect(result).toMatchObject({
      isSplit: true,
      hasOtherSeries: true,
      seriesColumnNames: ["North", "South", "Other"],
      data: [{ week: "2024-01-01", North: 5, South: 3, Other: 2 }],
    });
  });

  it("keeps a real district named Other as a district", () => {
    const result = _split([
      { week: "2024-01-01", district: "North", cases: 5 },
      { week: "2024-01-01", district: "Other", cases: 3 },
    ]);

    expect(result).toMatchObject({
      isSplit: true,
      hasOtherSeries: false,
      seriesColumnNames: ["North", "Other"],
    });
  });

  it("returns the input unchanged when Other would name two series", () => {
    const data = [
      { week: "2024-01-01", district: "Other", cases: 5 },
      { week: "2024-01-01", district: "South", cases: 3 },
      { week: "2024-01-01", district: null, cases: 2 },
    ];

    expect(_split(data)).toEqual({ isSplit: false, data });
  });

  it("returns the input unchanged when a district shares the x name", () => {
    const data = [
      { week: "2024-01-01", district: "week", cases: 5 },
      { week: "2024-01-01", district: "South", cases: 3 },
    ];

    expect(_split(data)).toEqual({ isSplit: false, data });
  });

  it("puts empty and unreadable dates after the readable ones", () => {
    const result = _split([
      { week: "2024-01-08", district: "North", cases: 1 },
      { week: null, district: "North", cases: 2 },
      { week: "not a date", district: "South", cases: 3 },
      { week: "2024-01-01", district: "South", cases: 4 },
    ]);

    expect(_getWeeks(result)).toEqual([
      "2024-01-01",
      "2024-01-08",
      null,
      "not a date",
    ]);
  });

  it("reads bigint values as numbers", () => {
    const result = _split([
      { week: "2024-01-01", district: "North", cases: 5n },
      { week: "2024-01-01", district: "South", cases: 3n },
      { week: "2024-01-01", district: "South", cases: 4n },
    ]);

    expect(result.data).toEqual([{ week: "2024-01-01", North: 5, South: 7 }]);
  });

  it("names a series (Blank) for districts that are empty text", () => {
    const result = _split([
      { week: "2024-01-01", district: "North", cases: 5 },
      { week: "2024-01-01", district: "", cases: 3 },
    ]);

    expect(result).toMatchObject({
      seriesColumnNames: ["North", "(Blank)"],
      data: [{ week: "2024-01-01", North: 5, "(Blank)": 3 }],
    });
  });

  it("names the district column it split by", () => {
    const result = _split([
      { week: "2024-01-01", district: "North", cases: 5 },
      { week: "2024-01-01", district: "South", cases: 3 },
    ]);

    expect(result).toMatchObject({ splitColumnName: "district" });
  });
});
