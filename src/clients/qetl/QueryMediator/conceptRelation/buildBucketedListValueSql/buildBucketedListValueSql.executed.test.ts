/**
 * Executed tests for the per-period value SQL.
 *
 * Each case runs the emitted subquery against a real DuckDB over real parquet
 * and asserts the lists it returns, because every property this SQL owes (the
 * NULL rule, the tie-breaks, where each period starts, the order) is a
 * property of returned values. A test of the SQL text would pass with the
 * wrong answer.
 *
 * The visits fixture ties on purpose, and holds a NULL value, a NULL date, a
 * month whose only cells are NULL, and a month whose row sits last in the file
 * but is earliest by date. Each rule's expected months were derived by hand
 * from the single-value rule applied to that month's rows.
 */
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getRowNumberedViewName } from "@/clients/DuckDbClient/duckDbSqlText";
import {
  buildBucketedListTypeSql,
  buildBucketedListValueSql,
} from "@/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql/buildBucketedListValueSql";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import { withDuckDb } from "../../../../../../tests/integration/queries/executedDuckDb";
import type { BucketedListValueSqlOptions } from "@/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql/buildBucketedListValueSql";
import type { DuckDBConnection } from "@duckdb/node-api";

const VISITS = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const READINGS = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const SPINE = "concept_cccccccc-3333-4333-8333-cccccccccccc__individuals";

/** Monthly `first` of the score; each test overrides what it needs. */
const SCORE_PER_MONTH: BucketedListValueSqlOptions = {
  datasetId: VISITS,
  selectColumnName: "score",
  columnDataType: "bigint",
  primaryKeyColumnName: "person_id",
  // The space proves the date column is quoted.
  bucketColumnName: "Visit date",
  bucketGrain: "month",
  ruleType: "first",
  externalIdsTable: "individuals",
  externalIdColumn: "external_id",
};

/** The months `p1` has a non-NULL score in, in date order. */
const SCORE_MONTHS = ["2025-12-01", "2026-01-01", "2026-02-01", "2026-04-01"];

type Period = { bucket: string; value: unknown };

/**
 * Builds the fixture world. File order matters: `row_order` is a row's
 * position here.
 *
 * Visits, by month for `p1`:
 * - 2025-12: one row (1, North, mango), written last but one.
 * - 2026-01: 10 South, 20 North, NULL North, 30 South, then 50 East written
 *   last though dated 2026-01-01. Regions tie at two each. Labels are zebra,
 *   Ángel, Apple, apple, and NULL.
 * - 2026-02: a NULL row first, then 7 East. Labels apple and Apple, which
 *   differ only by case.
 * - 2026-03: only NULL cells.
 * - 2026-04: 5 West, then 6 and 8 with NULL regions. One label, Banana.
 * - A row with no date (99 West zzz).
 * `p2` has one row whose cells are all NULL; `p3` has no rows.
 *
 * Readings are four instants around a year end, with a Sunday, for checking
 * where each period starts on a `TIMESTAMP` and on a `DATE` column.
 */
async function _seed(connection: DuckDBConnection): Promise<void> {
  const visitsPath = join(
    tmpdir(),
    `ava-bucketed-visits-${randomUUID()}.parquet`,
  );
  const readingsPath = join(
    tmpdir(),
    `ava-bucketed-readings-${randomUUID()}.parquet`,
  );

  await connection.run(`
    COPY (
      SELECT * FROM (VALUES
        ('p1', DATE '2026-01-05', 10, 'South', 'zebra'),
        ('p1', DATE '2026-01-20', 20, 'North', 'Ángel'),
        ('p1', DATE '2026-01-25', NULL, 'North', 'Apple'),
        ('p1', DATE '2026-01-28', 30, 'South', 'apple'),
        ('p1', DATE '2026-02-03', NULL, NULL, 'apple'),
        ('p1', DATE '2026-02-10', 7, 'East', 'Apple'),
        ('p1', NULL, 99, 'West', 'zzz'),
        ('p1', DATE '2026-03-15', NULL, NULL, NULL),
        ('p1', DATE '2026-04-01', 5, 'West', NULL),
        ('p1', DATE '2026-04-02', 6, NULL, NULL),
        ('p1', DATE '2026-04-03', 8, NULL, 'Banana'),
        ('p1', DATE '2025-12-31', 1, 'North', 'mango'),
        ('p1', DATE '2026-01-01', 50, 'East', NULL),
        ('p2', DATE '2026-01-10', NULL, NULL, NULL)
      ) AS t(person_id, "Visit date", score, region, label)
    ) TO '${visitsPath}' (FORMAT parquet)
  `);
  await connection.run(`
    COPY (
      SELECT * FROM (VALUES
        ('p1', TIMESTAMP '2026-01-04 23:59:59', DATE '2026-01-04', 1),
        ('p1', TIMESTAMP '2026-01-07 10:00:00', DATE '2026-01-07', 1),
        ('p1', TIMESTAMP '2026-05-20 08:00:00', DATE '2026-05-20', 1),
        ('p1', TIMESTAMP '2025-12-31 23:00:00', DATE '2025-12-31', 1)
      ) AS t(person_id, read_at, read_on, reading)
    ) TO '${readingsPath}' (FORMAT parquet)
  `);
  await connection.run(`
    CREATE VIEW "${getRowNumberedViewName(VISITS)}" AS
      SELECT * FROM read_parquet('${visitsPath}', file_row_number = true);
    CREATE VIEW "${getRowNumberedViewName(READINGS)}" AS
      SELECT * FROM read_parquet('${readingsPath}', file_row_number = true);
    CREATE TABLE "${SPINE}" AS
      SELECT * FROM (VALUES ('p1'), ('p2'), ('p3')) AS t(external_id);
  `);
}

/**
 * Each record's periods for one field. `to_json` renders a `DATE` as
 * `YYYY-MM-DD` and a `BIGINT` as a number, so the lists compare as plain
 * JSON.
 */
async function _readPeriods(
  overrides: Partial<BucketedListValueSqlOptions> = {},
): Promise<Record<string, Period[]>> {
  const fieldSql = buildBucketedListValueSql({
    ...SCORE_PER_MONTH,
    ...overrides,
  });
  return await withDuckDb(async (connection) => {
    await _seed(connection);
    const reader = await connection.runAndReadAll(`
      SELECT
        individuals.external_id AS external_id,
        CAST(to_json(${fieldSql}) AS VARCHAR) AS field_json
      FROM "${SPINE}" individuals
      ORDER BY external_id
    `);
    return Object.fromEntries(
      reader.getRowObjectsJson().map((row) => {
        return [
          String(row.external_id),
          JSON.parse(String(row.field_json)) as Period[],
        ];
      }),
    );
  });
}

/** Pairs each of `buckets` with the value at the same position. */
function _periods(
  values: readonly unknown[],
  buckets: readonly string[] = SCORE_MONTHS,
): Period[] {
  return buckets.map((bucket, index) => {
    return { bucket, value: values[index] };
  });
}

/** The DuckDB type of each named field, as `DESCRIBE` reports it. */
async function _describeFields(
  fields: Readonly<Record<string, Partial<BucketedListValueSqlOptions>>>,
): Promise<Record<string, string>> {
  const selectors = Object.entries(fields).map(([name, overrides]) => {
    return `${buildBucketedListValueSql({ ...SCORE_PER_MONTH, ...overrides })} AS "${name}"`;
  });
  return await withDuckDb(async (connection) => {
    await _seed(connection);
    await connection.run(`
      CREATE VIEW field_types AS
      SELECT ${selectors.join(",\n")}
      FROM "${SPINE}" individuals
    `);
    const reader = await connection.runAndReadAll("DESCRIBE field_types");
    return Object.fromEntries(
      reader.getRowObjectsJson().map((row) => {
        return [String(row.column_name), String(row.column_type)];
      }),
    );
  });
}

describe("buildBucketedListValueSql", () => {
  it.each([
    { ruleType: "first", values: [1, 10, 7, 5] },
    { ruleType: "sum", values: [1, 110, 7, 19] },
    { ruleType: "avg", values: [1, 27.5, 7, 6.333333333333333] },
    { ruleType: "count", values: [1, 4, 1, 3] },
    { ruleType: "max", values: [1, 50, 7, 8] },
    { ruleType: "min", values: [1, 10, 7, 5] },
    { ruleType: "most_frequent", values: [1, 10, 7, 5] },
  ] as const)(
    "gives the $ruleType of each month's non-NULL scores",
    async ({ ruleType, values }) => {
      const periods = await _readPeriods({ ruleType });

      expect(periods.p1).toEqual(_periods(values));
    },
  );

  // January's earliest date holds 50, but it is the last row in the file.
  // February's first row is NULL.
  it("keeps the first non-NULL value in file order, not the earliest date", async () => {
    const periods = await _readPeriods({ ruleType: "first" });

    expect(periods.p1?.[1]).toEqual({ bucket: "2026-01-01", value: 10 });
    expect(periods.p1?.[2]).toEqual({ bucket: "2026-02-01", value: 7 });
  });

  // January has South twice and North twice, South first in the file.
  it("breaks a most frequent tie within a month by value, not by file order", async () => {
    const periods = await _readPeriods({
      ruleType: "most_frequent",
      selectColumnName: "region",
      columnDataType: "varchar",
    });

    expect(periods.p1?.[1]).toEqual({ bucket: "2026-01-01", value: "North" });
  });

  // April's regions are West, NULL, NULL.
  it("never picks NULL as a month's most frequent value", async () => {
    const periods = await _readPeriods({
      ruleType: "most_frequent",
      selectColumnName: "region",
      columnDataType: "varchar",
    });

    expect(periods.p1?.[3]).toEqual({ bucket: "2026-04-01", value: "West" });
  });

  it("keeps text in its own type for max and min", async () => {
    const [maxPeriods, minPeriods] = await Promise.all([
      _readPeriods({
        ruleType: "max",
        selectColumnName: "region",
        columnDataType: "varchar",
      }),
      _readPeriods({
        ruleType: "min",
        selectColumnName: "region",
        columnDataType: "varchar",
      }),
    ]);

    expect(maxPeriods.p1).toEqual(_periods(["North", "South", "East", "West"]));
    expect(minPeriods.p1).toEqual(_periods(["North", "East", "East", "West"]));
  });

  // Byte order would put 'Ángel' above 'zebra' and 'Apple' below 'apple'.
  // January holds zebra, Ángel, Apple, and apple. February holds apple and
  // Apple, whose keys tie, so the value breaks the tie in byte order.
  it("compares text max and min alphabetically, ignoring case and accents", async () => {
    const [maxPeriods, minPeriods] = await Promise.all([
      _readPeriods({
        ruleType: "max",
        selectColumnName: "label",
        columnDataType: "varchar",
      }),
      _readPeriods({
        ruleType: "min",
        selectColumnName: "label",
        columnDataType: "varchar",
      }),
    ]);

    expect(maxPeriods.p1).toEqual(
      _periods(["mango", "zebra", "apple", "Banana"]),
    );
    expect(minPeriods.p1).toEqual(
      _periods(["mango", "Ángel", "Apple", "Banana"]),
    );
  });

  it("drops a row with no date instead of giving it a period", async () => {
    const periods = await _readPeriods({ ruleType: "max" });

    const buckets = (periods.p1 ?? []).map((period) => {
      return period.bucket;
    });
    expect(buckets).not.toContain(null);
    expect(
      (periods.p1 ?? []).map((period) => {
        return period.value;
      }),
    ).not.toContain(99);
  });

  it("leaves out a month whose only values are NULL", async () => {
    const periods = await _readPeriods({ ruleType: "count" });

    expect(
      (periods.p1 ?? []).map((period) => {
        return period.bucket;
      }),
    ).toEqual(SCORE_MONTHS);
  });

  it("orders months by date even when the earliest month is written last", async () => {
    const periods = await _readPeriods({ ruleType: "first" });

    expect(periods.p1?.[0]).toEqual({ bucket: "2025-12-01", value: 1 });
  });

  it("gives an empty list to a record with only NULL values and to one with no rows", async () => {
    const periods = await _readPeriods({ ruleType: "avg" });

    expect(periods.p2).toEqual([]);
    expect(periods.p3).toEqual([]);
  });

  // 2026-01-04 is a Sunday, so it belongs to the ISO week of 2025-12-29.
  // Quarters start in January, April, July, and October.
  it.each(
    (
      [
        [
          "day",
          ["2025-12-31", "2026-01-04", "2026-01-07", "2026-05-20"],
          [1, 1, 1, 1],
        ],
        ["week", ["2025-12-29", "2026-01-05", "2026-05-18"], [2, 1, 1]],
        ["month", ["2025-12-01", "2026-01-01", "2026-05-01"], [1, 2, 1]],
        ["quarter", ["2025-10-01", "2026-01-01", "2026-04-01"], [1, 2, 1]],
        ["year", ["2025-01-01", "2026-01-01"], [1, 3]],
      ] as const
    ).flatMap(([bucketGrain, buckets, counts]) => {
      return [
        {
          bucketGrain,
          columnType: "TIMESTAMP",
          bucketColumnName: "read_at",
          buckets,
          counts,
        },
        {
          bucketGrain,
          columnType: "DATE",
          bucketColumnName: "read_on",
          buckets,
          counts,
        },
      ];
    }),
  )(
    "starts each $bucketGrain on its first day for a $columnType column",
    async ({ bucketGrain, bucketColumnName, buckets, counts }) => {
      const periods = await _readPeriods({
        datasetId: READINGS,
        selectColumnName: "reading",
        bucketColumnName,
        bucketGrain,
        ruleType: "count",
      });

      expect(periods.p1).toEqual(_periods(counts, buckets));
    },
  );

  it("types each field as a list of bucket and value structs", async () => {
    const types = await _describeFields({
      first: { ruleType: "first" },
      avg: { ruleType: "avg" },
      count: { ruleType: "count" },
      "max region": {
        ruleType: "max",
        selectColumnName: "region",
        columnDataType: "varchar",
      },
    });

    expect(types).toEqual({
      first: 'STRUCT(bucket DATE, "value" INTEGER)[]',
      avg: 'STRUCT(bucket DATE, "value" DOUBLE)[]',
      count: 'STRUCT(bucket DATE, "value" BIGINT)[]',
      "max region": 'STRUCT(bucket DATE, "value" VARCHAR)[]',
    });
  });

  // One run proves nothing: the single-value `first` once returned four
  // different values in six runs.
  it("returns the same first and most frequent months across ten runs", async () => {
    const runs = [];
    for (let run = 0; run < 10; run += 1) {
      const [first, mostFrequent] = await Promise.all([
        _readPeriods({ ruleType: "first" }),
        _readPeriods({
          ruleType: "most_frequent",
          selectColumnName: "region",
          columnDataType: "varchar",
        }),
      ]);
      runs.push(JSON.stringify([first.p1, mostFrequent.p1]));
    }

    expect(new Set(runs).size).toBe(1);
  });

  // The outer table is a dataset here: the analyzer cannot inspect a
  // concept's spine table, which is not what this test is about.
  it.each([
    "first",
    "sum",
    "avg",
    "count",
    "max",
    "min",
    "most_frequent",
  ] as const)(
    "emits SQL the analyzer reads as one plain query for %s",
    (ruleType) => {
      const sql = `SELECT ${buildBucketedListValueSql({ ...SCORE_PER_MONTH, ruleType })} AS field FROM "${READINGS}" individuals`;

      expect(sql).not.toContain("$");
      expect(sql).not.toMatch(/\/\*|\*\//);
      expect(sql).not.toMatch(/\bE'/i);
      expect(DuckDbSqlAnalyzer.isSinglePlainQuery(sql)).toBe(true);
      // The `ava_rows_` view counts as a read of its dataset.
      expect(DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(sql)).toEqual({
        kind: "read",
        relations: expect.arrayContaining([{ kind: "dataset", id: VISITS }]),
        internalTableNames: [],
      });
    },
  );
});

describe("buildBucketedListTypeSql", () => {
  it("casts NULL to the per-period list of a value type", async () => {
    const typeName = await withDuckDb(async (connection) => {
      const reader = await connection.runAndReadAll(
        `SELECT typeof(CAST(NULL AS ${buildBucketedListTypeSql("DOUBLE")})) AS type_name`,
      );
      return reader.getRowObjectsJson()[0]?.type_name;
    });

    expect(typeName).toBe('STRUCT(bucket DATE, "value" DOUBLE)[]');
  });
});
