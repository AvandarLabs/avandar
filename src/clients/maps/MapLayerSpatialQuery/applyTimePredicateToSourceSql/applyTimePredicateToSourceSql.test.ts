/**
 * Time-range wrapping for map-layer source SQL.
 */
import { describe, expect, it } from "vitest";
import { applyTimePredicateToSourceSql } from "./applyTimePredicateToSourceSql";

describe("applyTimePredicateToSourceSql", () => {
  it("wraps source sql with an inclusive timestamp between", () => {
    const sql = applyTimePredicateToSourceSql({
      sourceSql: "SELECT * FROM cases",
      timeColumnName: "observed_at",
      timeRange: {
        start: "2026-01-01T00:00:00.000Z",
        end: "2026-01-31T23:59:59.000Z",
      },
    });
    expect(sql).toContain("TRY_CAST");
    expect(sql).toContain("BETWEEN");
    expect(sql).toContain("observed_at");
    expect(sql).not.toContain("ST_");
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
});
