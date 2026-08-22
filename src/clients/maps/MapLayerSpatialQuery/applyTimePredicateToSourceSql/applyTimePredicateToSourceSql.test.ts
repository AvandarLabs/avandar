/**
 * Time-range wrapping for map-layer source SQL.
 */
import { describe, expect, it } from "vitest";
import { applyTimePredicateToSourceSql } from "./applyTimePredicateToSourceSql";

const JANUARY = {
  start: "2026-01-01T00:00:00.000Z",
  end: "2026-01-31T23:59:59.000Z",
};

describe("applyTimePredicateToSourceSql", () => {
  it("casts a text time column, since there is nothing else to compare", () => {
    const sql = applyTimePredicateToSourceSql({
      sourceSql: "SELECT * FROM cases",
      timeColumnName: "observed_at",
      timeRange: JANUARY,
      timeColumnDataType: "varchar",
    });
    expect(sql).toContain('TRY_CAST("observed_at" AS TIMESTAMP)');
    expect(sql).toContain("BETWEEN");
    expect(sql).not.toContain("ST_");
  });

  it("compares a timestamp column without casting it", () => {
    // Casting the column would force a conversion per row and stop DuckDB
    // skipping Parquet row groups whose recorded range cannot overlap.
    const sql = applyTimePredicateToSourceSql({
      sourceSql: "SELECT * FROM cases",
      timeColumnName: "observed_at",
      timeRange: JANUARY,
      timeColumnDataType: "timestamp",
    });
    expect(sql).not.toContain('TRY_CAST("observed_at"');
    expect(sql).toContain('"observed_at" >=');
    expect(sql).toContain('"observed_at" <=');
  });

  it("compares a date column without casting it", () => {
    const sql = applyTimePredicateToSourceSql({
      sourceSql: "SELECT * FROM cases",
      timeColumnName: "date",
      timeRange: JANUARY,
      timeColumnDataType: "date",
    });
    expect(sql).not.toContain('TRY_CAST("date"');
    expect(sql).toContain('"date" >=');
  });

  it("casts a column of unknown type rather than assuming it compares", () => {
    const sql = applyTimePredicateToSourceSql({
      sourceSql: "SELECT * FROM cases",
      timeColumnName: "observed_at",
      timeRange: JANUARY,
    });
    expect(sql).toContain('TRY_CAST("observed_at" AS TIMESTAMP)');
  });

  it("returns source sql unchanged without a time range", () => {
    expect(
      applyTimePredicateToSourceSql({
        sourceSql: "SELECT 1",
        timeColumnName: "observed_at",
        timeRange: undefined,
      }),
    ).toBe("SELECT 1");
  });

  it("returns source sql unchanged without a time column", () => {
    expect(
      applyTimePredicateToSourceSql({
        sourceSql: "SELECT 1",
        timeColumnName: undefined,
        timeRange: JANUARY,
      }),
    ).toBe("SELECT 1");
  });
});
