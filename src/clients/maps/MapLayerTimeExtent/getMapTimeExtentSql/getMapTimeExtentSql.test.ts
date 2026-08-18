/**
 * Union min/max timestamp SQL for the map clock extent.
 */
import { describe, expect, it } from "vitest";
import { getMapTimeExtentSql } from "./getMapTimeExtentSql";

describe("getMapTimeExtentSql", () => {
  it("unions min and max timestamps across participating layers", () => {
    const sql = getMapTimeExtentSql([
      { sourceSql: "SELECT * FROM cases", timeColumnName: "observed_at" },
      { sourceSql: "SELECT * FROM events", timeColumnName: "event_date" },
    ]);

    expect(sql).toContain("MIN(TRY_CAST");
    expect(sql).toContain("MAX(TRY_CAST");
    expect(sql).toContain("AS TIMESTAMP");
    expect(sql).toContain("extent_start");
    expect(sql).toContain("extent_end");
    expect(sql).toContain("UNION");
    expect(sql).toContain("observed_at");
    expect(sql).toContain("event_date");
    expect(sql).toContain("SELECT * FROM cases");
    expect(sql).toContain("SELECT * FROM events");
    expect(sql).not.toContain("ST_");
  });
});
