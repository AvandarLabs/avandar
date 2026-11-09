import { describe, expect, it } from "vitest";
import { redactSqlLiterals } from "$/agent/pageContext/redactSqlLiterals.ts";

function _isEmail(text: string): boolean {
  return text.includes("@");
}

describe("redactSqlLiterals", () => {
  it("replaces a sensitive literal and keeps the others", () => {
    const sql = `SELECT * FROM t WHERE "email" = 'jane@example.com' AND "state" = 'Texas'`;

    expect(redactSqlLiterals(sql, _isEmail)).toBe(
      `SELECT * FROM t WHERE "email" = '<redacted>' AND "state" = 'Texas'`,
    );
  });

  it("reads a doubled quote as part of the literal", () => {
    const sql = `SELECT 'O''Brien@example.com' AS a, 'O''Hara' AS b`;

    expect(redactSqlLiterals(sql, _isEmail)).toBe(
      `SELECT '<redacted>' AS a, 'O''Hara' AS b`,
    );
  });

  it("passes the unescaped value to the check", () => {
    const seen: string[] = [];
    redactSqlLiterals(`SELECT 'it''s'`, (text) => {
      seen.push(text);
      return false;
    });

    expect(seen).toEqual(["it's"]);
  });

  it("skips quotes inside double-quoted identifiers", () => {
    const sql = `SELECT "owner's email" FROM t WHERE "owner's email" = 'a@b.co'`;

    expect(redactSqlLiterals(sql, _isEmail)).toBe(
      `SELECT "owner's email" FROM t WHERE "owner's email" = '<redacted>'`,
    );
  });

  it("checks an unterminated literal to the end of the SQL", () => {
    expect(redactSqlLiterals(`SELECT 'a@b.co`, _isEmail)).toBe(
      `SELECT '<redacted>'`,
    );
    expect(redactSqlLiterals(`SELECT 'Texas`, _isEmail)).toBe(`SELECT 'Texas`);
  });

  it("returns SQL without literals unchanged", () => {
    const sql = `SELECT count(*) FROM t WHERE a < b`;

    expect(redactSqlLiterals(sql, _isEmail)).toBe(sql);
  });
});
