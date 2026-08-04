import { quoteSqlIdentifier } from "@utils/sql/quoteSqlIdentifier/quoteSqlIdentifier.ts";
import { describe, expect, it } from "vitest";

describe("quoteSqlIdentifier", () => {
  it("wraps a plain identifier in double quotes", () => {
    expect(quoteSqlIdentifier("my_table")).toBe('"my_table"');
  });

  it("quotes identifiers with dashes (e.g. dataset UUIDs)", () => {
    expect(quoteSqlIdentifier("a1b2-c3d4")).toBe('"a1b2-c3d4"');
  });

  it("escapes embedded double quotes by doubling them", () => {
    expect(quoteSqlIdentifier('a"b')).toBe('"a""b"');
    expect(quoteSqlIdentifier('"')).toBe('""""');
  });

  it("handles empty strings", () => {
    expect(quoteSqlIdentifier("")).toBe('""');
  });
});
