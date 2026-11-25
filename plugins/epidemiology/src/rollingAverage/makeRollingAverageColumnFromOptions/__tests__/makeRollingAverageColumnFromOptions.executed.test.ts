import { DuckDBInstance } from "@duckdb/node-api";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeRollingAverageColumnFromOptions } from "../makeRollingAverageColumnFromOptions";
import type { RollingWindow } from "../makeRollingAverageColumnFromOptions";
import type { DerivedColumn } from "@avandar/plugin-sdk";
import type { DuckDBConnection } from "@duckdb/node-api";

/**
 * Runs the rolling average expression in real DuckDB, the engine the Data
 * Explorer runs it in. Plugin files cannot import the repo's executed-test
 * harness under `tests/`, so this file opens its own in-memory database.
 */
const FIXTURE_SQL = `
  CREATE TABLE borough_cases AS SELECT * FROM (VALUES
    ('A', DATE '2024-01-01', 1::BIGINT),
    ('A', DATE '2024-01-02', 2),
    ('A', DATE '2024-01-03', 3),
    ('A', DATE '2024-01-05', 5),
    ('B', DATE '2024-01-01', 10),
    ('B', DATE '2024-01-02', 20),
    ('B', DATE '2024-01-03', 30),
    ('B', DATE '2024-01-04', 40),
    ('B', DATE '2024-01-05', 50)
  ) AS t(borough, report_date, cases);

  CREATE TABLE line_list AS SELECT * FROM (VALUES
    ('A', DATE '2024-01-01'),
    ('A', DATE '2024-01-01'),
    ('A', DATE '2024-01-03'),
    ('B', DATE '2024-01-01'),
    ('B', DATE '2024-01-02'),
    ('B', DATE '2024-01-04')
  ) AS t(borough, onset);

  CREATE TABLE daily_cases AS
    SELECT
      report_date,
      CAST(report_date AS TIMESTAMP) + INTERVAL 9 HOUR AS reported_at,
      day_offset + 1 AS cases
    FROM (
      SELECT
        day_offset,
        DATE '2024-01-01' + CAST(day_offset AS INTEGER) AS report_date
      FROM range(0, 15) AS t(day_offset)
    );
`;

let instance: DuckDBInstance;
let connection: DuckDBConnection;

/** Replaces each placeholder with its input column, quoted as the host does. */
function _getSqlFromColumn(column: DerivedColumn): string {
  return column.expression.replace(
    /\{([A-Za-z_][A-Za-z0-9_]*)\}/g,
    (_match, name: string) => {
      return `"${(column.inputs[name] ?? "").replaceAll('"', '""')}"`;
    },
  );
}

/**
 * Runs the column over `table` and returns its value per row, keyed by the
 * row's `key` SQL, such as `borough || ' ' || report_date`.
 */
async function _readAverages(
  options: Readonly<{
    table: string;
    key: string;
    dateColumn?: string;
    window: RollingWindow;
    groupByColumn?: string;
    /** True to count each row as 1 instead of averaging a value column. */
    countRows?: boolean;
  }>,
): Promise<Map<string, number>> {
  const column = makeRollingAverageColumnFromOptions({
    valueColumn: options.countRows ? undefined : "cases",
    dateColumn: options.dateColumn ?? "report_date",
    window: options.window,
    groupByColumn: options.groupByColumn,
  });
  const reader = await connection.runAndReadAll(
    `SELECT CAST(${options.key} AS VARCHAR) AS row_key,
       ${_getSqlFromColumn(column)} AS average
     FROM ${options.table}`,
  );
  return new Map(
    reader.getRowObjects().map((row) => {
      return [String(row.row_key), Number(row.average)];
    }),
  );
}

function _readBoroughAverages(
  groupByColumn: string | undefined,
): Promise<Map<string, number>> {
  return _readAverages({
    table: "borough_cases",
    key: "borough || ' ' || report_date",
    window: { size: 3, unit: "day" },
    groupByColumn,
  });
}

beforeAll(async () => {
  instance = await DuckDBInstance.create(":memory:");
  connection = await instance.connect();
  await connection.run(FIXTURE_SQL);
});

afterAll(() => {
  connection.closeSync();
  instance.closeSync();
});

describe("makeRollingAverageColumnFromOptions executed", () => {
  it("averages only the dates inside the window when a day is missing", async () => {
    const averages = await _readBoroughAverages("borough");
    // A has no row on 2024-01-04, so its 3-day window on 2024-01-05 holds
    // 2024-01-03 and 2024-01-05 only. A row-count window would reach back to
    // 2024-01-02 and give 3.33.
    expect(averages.get("A 2024-01-05")).toBe(4);
  });

  it("averages each group on its own", async () => {
    const averages = await _readBoroughAverages("borough");
    expect(
      ["01", "02", "03", "05"].map((day) => {
        return averages.get(`A 2024-01-${day}`);
      }),
    ).toEqual([1, 1.5, 2, 4]);
    expect(
      ["01", "02", "03", "04", "05"].map((day) => {
        return averages.get(`B 2024-01-${day}`);
      }),
    ).toEqual([10, 15, 20, 30, 40]);
  });

  it("averages every row in the window without a group-by column", async () => {
    const averages = await _readBoroughAverages(undefined);
    // 2024-01-03 to 2024-01-05 across both boroughs: 3, 5, 30, 40, and 50.
    expect(averages.get("B 2024-01-05")).toBe(25.6);
  });

  it.each([
    [1, "2024-01-10", 7],
    [1, "2024-01-15", 12],
    [2, "2024-01-15", 8.5],
  ])(
    "averages a %i-week window ending %s over the days in it",
    async (size, day, average) => {
      const averages = await _readAverages({
        table: "daily_cases",
        key: "report_date",
        window: { size, unit: "week" },
      });
      expect(averages.get(day)).toBe(average);
    },
  );

  it("counts each line-list row as 1 and divides by the window length", async () => {
    const averages = await _readAverages({
      table: "line_list",
      key: "borough || ' ' || onset",
      dateColumn: "onset",
      window: { size: 3, unit: "day" },
      countRows: true,
    });
    // Jan 1 holds 3 rows. A 1-day window is that count, not the average of
    // the constant 1, which would be 1.
    const oneDay = await _readAverages({
      table: "line_list",
      key: "onset",
      dateColumn: "onset",
      window: { size: 1, unit: "day" },
      countRows: true,
    });
    expect(oneDay.get("2024-01-01")).toBe(3);
    // 3-day windows, with a day that has no row counting as zero: Jan 1 is
    // 3/3, Jan 2 is 4/3, Jan 3 is 5/3, and Jan 4 is 3/3.
    expect(averages.get("A 2024-01-01")).toBeCloseTo(1);
    expect(averages.get("B 2024-01-02")).toBeCloseTo(4 / 3);
    expect(averages.get("A 2024-01-03")).toBeCloseTo(5 / 3);
    expect(averages.get("B 2024-01-04")).toBeCloseTo(1);
  });

  it("counts each group's rows on their own when no value column is set", async () => {
    const averages = await _readAverages({
      table: "line_list",
      key: "borough || ' ' || onset",
      dateColumn: "onset",
      window: { size: 3, unit: "day" },
      groupByColumn: "borough",
      countRows: true,
    });
    // A's Jan 3 window holds its two Jan 1 rows and its Jan 3 row, not B's.
    expect(averages.get("A 2024-01-01")).toBeCloseTo(2 / 3);
    expect(averages.get("A 2024-01-03")).toBeCloseTo(1);
    expect(averages.get("B 2024-01-04")).toBeCloseTo(2 / 3);
  });

  it("reaches back whole days from a timestamp column", async () => {
    const averages = await _readAverages({
      table: "daily_cases",
      key: "report_date",
      dateColumn: "reported_at",
      window: { size: 7, unit: "day" },
    });
    expect(averages.get("2024-01-10")).toBe(7);
  });
});
