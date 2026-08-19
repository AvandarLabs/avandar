/**
 * Row-level tests that the time filter selects the same rows whichever
 * comparison it emits.
 *
 * The predicate has two forms, one casting the column and one comparing it
 * directly, and the direct form exists purely for speed. Executing both
 * against the same rows is what keeps that optimization from quietly changing
 * which rows a map shows.
 */
import { describe, expect, it } from "vitest";
import { applyTimePredicateToSourceSql } from "@/clients/maps/MapLayerSpatialQuery/applyTimePredicateToSourceSql/applyTimePredicateToSourceSql";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";
import type { DuckDBConnection } from "@duckdb/node-api";

const JUNE = {
  start: "2021-06-01T00:00:00.000Z",
  end: "2021-06-30T23:59:59.000Z",
};

/** The same five days, once as real dates and once as the text a CSV leaves. */
const FIXTURE_SQL = `
  CREATE TABLE typed_cases AS SELECT * FROM (VALUES
    (DATE '2021-05-31', 'before'),
    (DATE '2021-06-01', 'first'),
    (DATE '2021-06-15', 'middle'),
    (DATE '2021-06-30', 'last'),
    (DATE '2021-07-01', 'after')
  ) AS t(observed_at, label);

  CREATE TABLE text_cases AS SELECT * FROM (VALUES
    ('2021-05-31', 'before'),
    ('2021-06-01', 'first'),
    ('2021-06-15', 'middle'),
    ('2021-06-30', 'last'),
    ('2021-07-01', 'after')
  ) AS t(observed_at, label);
`;

async function _runLabels(options: {
  table: string;
  timeColumnDataType?: string;
}): Promise<string[]> {
  const sql = applyTimePredicateToSourceSql({
    sourceSql: `SELECT * FROM "${options.table}"`,
    timeColumnName: "observed_at",
    timeRange: JUNE,
    timeColumnDataType: options.timeColumnDataType,
  });
  return await withDuckDb(async (connection: DuckDBConnection) => {
    await connection.run(FIXTURE_SQL);
    const result = await connection.runAndReadAll(
      `SELECT label FROM (${sql}) AS filtered ORDER BY label`,
    );
    return result.getRowObjects().map((row) => {
      return String(row.label);
    });
  });
}

describe("applyTimePredicateToSourceSql executed", () => {
  it("keeps rows inside the window and both of its edges", async () => {
    expect(
      await _runLabels({ table: "typed_cases", timeColumnDataType: "date" }),
    ).toEqual(["first", "last", "middle"]);
  });

  it("selects the same rows from text as from real dates", async () => {
    // The uncast comparison is an optimization, so it has to agree exactly with
    // the cast one on the same days.
    const fromDates = await _runLabels({
      table: "typed_cases",
      timeColumnDataType: "date",
    });
    const fromText = await _runLabels({
      table: "text_cases",
      timeColumnDataType: "varchar",
    });
    expect(fromText).toEqual(fromDates);
  });

  it("selects the same rows whether or not the column type is known", async () => {
    const known = await _runLabels({
      table: "typed_cases",
      timeColumnDataType: "date",
    });
    const unknown = await _runLabels({ table: "typed_cases" });
    expect(unknown).toEqual(known);
  });

  it("excludes a row one day past the window's end", async () => {
    expect(
      await _runLabels({ table: "typed_cases", timeColumnDataType: "date" }),
    ).not.toContain("after");
  });
});
