import { DuckDBInstance } from "@duckdb/node-api";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compileQueryPlan } from "@/lib/agent/dataAgent/queryPlan/compileQueryPlan/compileQueryPlan";
import type { QueryPlanTable } from "@/lib/agent/dataAgent/queryPlan/compileQueryPlan/compileQueryPlan";
import type { QueryPlan } from "@/lib/agent/dataAgent/queryPlan/QueryPlan";
import type { DuckDBConnection } from "@duckdb/node-api";

const DEATHS: QueryPlanTable = {
  alias: "t0",
  columns: [
    { name: "state", dataType: "varchar" },
    { name: "county", dataType: "varchar" },
    { name: "date", dataType: "date" },
    { name: "population", dataType: "bigint" },
    { name: "daily_deaths", dataType: "bigint" },
  ],
};
const CASES: QueryPlanTable = {
  alias: "t1",
  columns: [
    { name: "state", dataType: "varchar" },
    { name: "county", dataType: "varchar" },
    { name: "date", dataType: "date" },
    { name: "daily_cases", dataType: "bigint" },
  ],
};

/** Two states; Ohio has two counties. Dates run Dec 2020 to Jan 2021. */
const SETUP_SQL = `
CREATE TABLE t0 AS SELECT * FROM (VALUES
  ('Ohio', 'Adams', DATE '2020-12-31', 100, 1),
  ('Ohio', 'Adams', DATE '2021-01-01', 100, 2),
  ('Ohio', 'Brown', DATE '2021-01-01', 300, 4),
  ('Ohio', 'Brown', DATE '2021-01-02', 300, 8),
  ('Utah', 'Cache', DATE '2021-01-01', 1000, 5),
  ('Utah', 'Cache', DATE '2021-01-02', 1000, 1)
) AS v(state, county, date, population, daily_deaths);
CREATE TABLE t1 AS SELECT * FROM (VALUES
  ('Ohio', 'Adams', DATE '2021-01-01', 20),
  ('Ohio', 'Brown', DATE '2021-01-02', 80),
  ('Utah', 'Cache', DATE '2021-01-01', 60)
) AS v(state, county, date, daily_cases);`;

function _plan(overrides: Partial<QueryPlan>): QueryPlan {
  return {
    measures: [{ table: "t0", column: "daily_deaths", name: "deaths" }],
    filters: [],
    from: "",
    to: "",
    relativePeriod: "none",
    timeGrain: "none",
    groupBy: [],
    calculation: "none",
    populationColumn: "",
    order: "time",
    limit: 0,
    onePerGroup: false,
    summary: "",
    ...overrides,
  };
}

let connection: DuckDBConnection;

beforeAll(async () => {
  const instance = await DuckDBInstance.create(":memory:");
  connection = await instance.connect();
  await connection.run(SETUP_SQL);
});

afterAll(() => {
  connection.closeSync();
});

async function _rows(plan: QueryPlan): Promise<unknown[][]> {
  const compiled = compileQueryPlan(plan, [DEATHS, CASES]);
  if (compiled.kind === "error") {
    throw new Error(compiled.message);
  }
  const reader = await connection.runAndReadAll(compiled.sql);
  return reader.getRowsJS().map((row) => {
    return row.map((value) => {
      return typeof value === "bigint" ? Number(value) : value;
    });
  });
}

describe("compileQueryPlan", () => {
  it("totals a measure for a filter and a year written as 2021", async () => {
    const rows = await _rows(
      _plan({
        filters: [{ column: "State", values: ["Ohio"] }],
        from: "2021",
        to: "2021",
      }),
    );

    expect(rows).toEqual([[14]]);
  });

  it("ranks groups by their total", async () => {
    const rows = await _rows(
      _plan({ groupBy: ["state"], order: "highest", limit: 1 }),
    );

    expect(rows).toEqual([["Ohio", 15]]);
  });

  it("divides by population taken once per place, then summed", async () => {
    const rows = await _rows(
      _plan({
        groupBy: ["state"],
        calculation: "per_person",
        populationColumn: "population",
        order: "highest",
      }),
    );

    expect(rows).toEqual([
      ["Ohio", 15, 400, 15 / 400],
      ["Utah", 6, 1000, 6 / 1000],
    ]);
  });

  it("lines up measures from two datasets and divides them", async () => {
    const rows = await _rows(
      _plan({
        measures: [
          { table: "t0", column: "daily_deaths", name: "deaths" },
          { table: "t1", column: "daily_cases", name: "cases" },
        ],
        groupBy: ["state"],
        calculation: "ratio",
        order: "highest",
      }),
    );

    expect(rows).toEqual(
      [
        ["Utah", 6, 60, 0.1],
        ["Ohio", 15, 100, 0.15],
      ].sort((left, right) => {
        return Number(right[3]) - Number(left[3]);
      }),
    );
  });

  it("keeps each group's single highest day", async () => {
    const rows = await _rows(
      _plan({
        timeGrain: "day",
        groupBy: ["state"],
        order: "highest",
        onePerGroup: true,
      }),
    );

    expect(
      rows.map((row) => {
        return [(row[0] as Date).toISOString().slice(0, 10), row[1], row[2]];
      }),
    ).toEqual([
      ["2021-01-02", "Ohio", 8],
      ["2021-01-01", "Utah", 5],
    ]);
  });

  it("counts a running total over the whole series before the period", async () => {
    const rows = await _rows(
      _plan({
        timeGrain: "day",
        calculation: "running_total",
        from: "2021-01-02",
      }),
    );

    expect(
      rows.map((row) => {
        return row.slice(1);
      }),
    ).toEqual([[9, 21]]);
  });

  it("reads 'last full year' from the data's own latest date", async () => {
    const rows = await _rows(_plan({ relativePeriod: "last_full_year" }));

    expect(rows).toEqual([[1]]);
  });

  it("explains an unknown column in words the model can act on", () => {
    const compiled = compileQueryPlan(
      _plan({ measures: [{ table: "t0", column: "deaths", name: "deaths" }] }),
      [DEATHS, CASES],
    );

    expect(compiled).toEqual({
      kind: "error",
      message:
        't0 has no column "deaths". Its columns: state, county, date, population, daily_deaths.',
    });
  });

  it("refuses to add up a column that is not a number", () => {
    const compiled = compileQueryPlan(
      _plan({ measures: [{ table: "t0", column: "date", name: "deaths" }] }),
      [DEATHS, CASES],
    );

    expect(compiled).toEqual({
      kind: "error",
      message:
        't0."date" is not a number column, so it cannot be added up. Number columns in t0: population, daily_deaths.',
    });
  });

  it("keeps every value of two filters on one column, not none", async () => {
    const rows = await _rows(
      _plan({
        filters: [
          { column: "state", values: ["Ohio"] },
          { column: "state", values: ["Utah"] },
        ],
        groupBy: ["state"],
        order: "highest",
      }),
    );

    expect(rows).toEqual([
      ["Ohio", 15],
      ["Utah", 6],
    ]);
  });

  it("reads a period ending on the data's last date as including it", async () => {
    const rows = await _rows(_plan({ from: "2021-01-01", to: "2021-01-02" }));

    expect(rows).toEqual([[20]]);
  });
});
