import { DuckDBInstance } from "@duckdb/node-api";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeIncidenceColumnsFromOptions } from "../makeIncidenceColumnsFromOptions";
import type {
  IncidenceBase,
  PopulationSource,
} from "../makeIncidenceColumnsFromOptions";
import type { DerivedColumn } from "@avandar/plugin-sdk";
import type { DuckDBConnection } from "@duckdb/node-api";

/**
 * Runs the incidence expressions in real DuckDB, the engine the Data Explorer
 * runs them in. Plugin files cannot import the repo's executed-test harness
 * under `tests/`, so this file opens its own in-memory database.
 *
 * Reference values. Exact Poisson 95% limits (Garwood, 1936): the lower limit
 * L solves P(X >= a | L) = 0.025 and the upper limit U solves
 * P(X <= a | U) = 0.025, equal to chi2(0.025, 2a) / 2 and
 * chi2(0.975, 2a + 2) / 2, listed to 5 significant figures. Byar's
 * approximation of them is as given in Rothman and Boice, Epidemiologic
 * Analysis with a Programmable Calculator (1979), listed to 4 significant
 * figures. All values are in cases.
 */
const REFERENCE_LIMITS = [
  { cases: 0, exact: [0, 3.6889], byar: [0, 3.668] },
  { cases: 1, exact: [0.025318, 5.5716], byar: [0.01307, 5.564] },
  { cases: 5, exact: [1.6235, 11.668], byar: [1.611, 11.67] },
  { cases: 10, exact: [4.7954, 18.39], byar: [4.787, 18.39] },
  { cases: 20, exact: [12.217, 30.888], byar: [12.21, 30.89] },
  { cases: 100, exact: [81.364, 121.63], byar: [81.36, 121.6] },
] as const;

/**
 * How far Byar's limits may sit from the exact ones, in cases. The largest
 * gaps in the table are 0.021 cases, at the upper limit for 0 cases, and
 * 0.012 cases, at the lower limits for 1 and 5 cases.
 */
const BYAR_TOLERANCE_IN_CASES = 0.025;

/** Case counts and populations, typed as the Data Explorer reads them. */
const FIXTURE_SQL = `
  CREATE TABLE boroughs AS SELECT * FROM (VALUES
    ('no population', 12::BIGINT, NULL::BIGINT),
    ('zero population', 12, 0),
    ('one in three', 1, 3),
    ('ten in 250k', 10, 250000),
    ('negative', -1, 100000),
    ('a0', 0, 100000),
    ('a1', 1, 100000),
    ('a5', 5, 100000),
    ('a10', 10, 100000),
    ('a20', 20, 100000),
    ('a100', 100, 100000)
  ) AS t(borough, case_count, pop_2024);
`;

type IncidenceRow = Readonly<{
  rate: number | null;
  lower: number | null;
  upper: number | null;
}>;

let instance: DuckDBInstance;
let connection: DuckDBConnection;

function _getNumberFromValue(value: unknown): number | null {
  if (value === null || typeof value === "number") {
    return value;
  }
  throw new Error(`Expected a DOUBLE or NULL, got ${String(value)}`);
}

/** Replaces each placeholder with its input column, quoted as the host does. */
function _getSqlFromColumn(column: DerivedColumn): string {
  return column.expression.replace(
    /\{([A-Za-z_][A-Za-z0-9_]*)\}/g,
    (_match, name: string) => {
      return `"${(column.inputs[name] ?? "").replaceAll('"', '""')}"`;
    },
  );
}

async function _readRows(
  options: Readonly<{ population: PopulationSource; base: IncidenceBase }>,
): Promise<Map<string, IncidenceRow>> {
  const [rate, lower, upper] = makeIncidenceColumnsFromOptions({
    casesColumn: "case_count",
    ...options,
  }).map(_getSqlFromColumn);
  const reader = await connection.runAndReadAll(
    `SELECT borough, ${rate} AS rate, ${lower} AS lower, ${upper} AS upper
     FROM boroughs`,
  );
  return new Map(
    reader.getRowObjects().map((row) => {
      return [
        String(row.borough),
        {
          rate: _getNumberFromValue(row.rate),
          lower: _getNumberFromValue(row.lower),
          upper: _getNumberFromValue(row.upper),
        },
      ];
    }),
  );
}

function _readColumnRows(
  base: IncidenceBase = 100_000,
): Promise<Map<string, IncidenceRow>> {
  return _readRows({
    population: { kind: "column", columnName: "pop_2024" },
    base,
  });
}

function _toFourSignificantFigures(value: number | null | undefined): number {
  return Number((value ?? Number.NaN).toPrecision(4));
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

describe("makeIncidenceColumnsFromOptions executed", () => {
  it.each(["no population", "zero population"])(
    "gives NULL in all three columns for the row with %s",
    async (borough) => {
      const rows = await _readColumnRows();
      expect(rows.get(borough)).toEqual({
        rate: null,
        lower: null,
        upper: null,
      });
    },
  );

  it("gives a lower bound of 0 at zero cases", async () => {
    const row = (await _readColumnRows()).get("a0");
    expect(row?.rate).toBe(0);
    expect(row?.lower).toBe(0);
  });

  it("gives the exact rate for the chosen base", async () => {
    const rows = await _readColumnRows(1_000);
    expect(rows.get("ten in 250k")?.rate).toBe(0.04);
  });

  it("divides whole-number columns without truncating", async () => {
    const rows = await _readColumnRows(1_000);
    expect(rows.get("one in three")?.rate).toBeCloseTo(333.3333, 4);
  });

  it("returns DOUBLE columns for BIGINT inputs", async () => {
    const [rate, lower, upper] = makeIncidenceColumnsFromOptions({
      casesColumn: "case_count",
      population: { kind: "column", columnName: "pop_2024" },
      base: 100_000,
    }).map(_getSqlFromColumn);
    const reader = await connection.runAndReadAll(
      `SELECT ${rate}, ${lower}, ${upper} FROM boroughs`,
    );
    expect(reader.columnTypes().map(String)).toEqual([
      "DOUBLE",
      "DOUBLE",
      "DOUBLE",
    ]);
  });

  it("gives NULL bounds for a negative case count instead of failing", async () => {
    const row = (await _readColumnRows()).get("negative");
    expect(row).toEqual({ rate: -1, lower: null, upper: null });
  });

  it.each(REFERENCE_LIMITS)(
    "gives Byar's limits for $cases cases",
    async ({ cases, byar }) => {
      const row = (await _readColumnRows()).get(`a${cases}`);
      expect(row?.rate).toBe(cases);
      expect(_toFourSignificantFigures(row?.lower)).toBe(byar[0]);
      expect(_toFourSignificantFigures(row?.upper)).toBe(byar[1]);
    },
  );

  it.each(REFERENCE_LIMITS)(
    "stays within the tolerance of the exact limits for $cases cases",
    async ({ cases, exact }) => {
      const row = (await _readColumnRows()).get(`a${cases}`);
      expect(
        Math.abs((row?.lower ?? Number.NaN) - exact[0]),
      ).toBeLessThanOrEqual(BYAR_TOLERANCE_IN_CASES);
      expect(
        Math.abs((row?.upper ?? Number.NaN) - exact[1]),
      ).toBeLessThanOrEqual(BYAR_TOLERANCE_IN_CASES);
    },
  );

  it("divides by a fixed population written into the SQL", async () => {
    const rows = await _readRows({
      population: { kind: "fixed", value: 250_000 },
      base: 1_000,
    });
    expect(rows.get("ten in 250k")?.rate).toBe(0.04);
    expect(rows.get("no population")?.rate).toBe(0.048);
  });
});
