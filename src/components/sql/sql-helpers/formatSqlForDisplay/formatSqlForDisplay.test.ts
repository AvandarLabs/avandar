import { describe, expect, it } from "vitest";
import { formatSqlForDisplay } from "./formatSqlForDisplay";

describe("formatSqlForDisplay", () => {
  it("returns the original string when parsing fails", () => {
    const sql = "NOT VALID SQL ;;";
    expect(formatSqlForDisplay(sql)).toBe(sql);
  });

  it("normalizes parseable SQL via sqlify", () => {
    const formatted = formatSqlForDisplay(
      'select a,b from "my_table" where a=1 limit 10',
    );
    expect(formatted).toMatch(/^SELECT/i);
    expect(formatted).toContain("FROM");
    expect(formatted).not.toBe('select a,b from "my_table" where a=1 limit 10');
  });
});
