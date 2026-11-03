import { normalizeSqlForSubquery } from "@utils/sql/normalizeSqlForSubquery/normalizeSqlForSubquery.ts";
import { describe, expect, it } from "vitest";

describe("normalizeSqlForSubquery", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeSqlForSubquery("  SELECT 1  \n")).toBe("SELECT 1");
  });

  it("removes a trailing semicolon", () => {
    expect(normalizeSqlForSubquery("SELECT 1;")).toBe("SELECT 1");
    expect(normalizeSqlForSubquery("SELECT 1 ;  \n")).toBe("SELECT 1");
  });

  it("removes repeated trailing semicolons", () => {
    expect(normalizeSqlForSubquery("SELECT 1;;")).toBe("SELECT 1");
  });

  it("removes a trailing line comment with no semicolon", () => {
    expect(normalizeSqlForSubquery("SELECT 1 -- done")).toBe("SELECT 1");
  });

  it("removes a trailing line comment after a semicolon", () => {
    expect(normalizeSqlForSubquery("SELECT 1; -- done")).toBe("SELECT 1");
  });

  it("removes a semicolon hidden before a trailing comment", () => {
    expect(normalizeSqlForSubquery("SELECT 1 ; -- a\n-- b\n")).toBe("SELECT 1");
  });

  it("removes a trailing block comment", () => {
    expect(normalizeSqlForSubquery("SELECT 1 /* done */;")).toBe("SELECT 1");
  });

  it("keeps comments that appear before real SQL", () => {
    expect(normalizeSqlForSubquery("SELECT 1 -- a\nFROM t -- b")).toBe(
      "SELECT 1 -- a\nFROM t",
    );
  });

  it("keeps comment markers and semicolons inside string literals", () => {
    expect(normalizeSqlForSubquery("SELECT 'a -- b; /* c */'")).toBe(
      "SELECT 'a -- b; /* c */'",
    );
  });

  it("keeps a string that ends with a semicolon", () => {
    expect(normalizeSqlForSubquery("SELECT ';'")).toBe("SELECT ';'");
  });

  it("handles escaped quotes inside string literals", () => {
    expect(normalizeSqlForSubquery("SELECT 'it''s -- ok' -- note")).toBe(
      "SELECT 'it''s -- ok'",
    );
  });

  it("keeps comment markers inside quoted identifiers", () => {
    expect(normalizeSqlForSubquery('SELECT 1 AS "a -- b" -- note')).toBe(
      'SELECT 1 AS "a -- b"',
    );
  });

  it("returns an empty string for comment-only or empty input", () => {
    expect(normalizeSqlForSubquery("")).toBe("");
    expect(normalizeSqlForSubquery("-- nothing")).toBe("");
  });

  describe("when embedded as a subquery", () => {
    function wrap(sql: string): string {
      return `SELECT * FROM (${normalizeSqlForSubquery(sql)}) AS t`;
    }

    it("keeps the closing parenthesis after a trailing line comment", () => {
      expect(wrap("SELECT 1 -- done")).toBe("SELECT * FROM (SELECT 1) AS t");
    });

    it("keeps the closing parenthesis after a semicolon and comment", () => {
      expect(wrap("SELECT 1; -- done")).toBe("SELECT * FROM (SELECT 1) AS t");
    });

    it("keeps the closing parenthesis after a trailing block comment", () => {
      expect(wrap("SELECT 1 /* done */")).toBe("SELECT * FROM (SELECT 1) AS t");
    });
  });
});
