import { describe, expect, it } from "vitest";
import { SqlStringLiterals } from "@/lib/agent/dataAgent/pagePrivacy/SqlStringLiterals";

function _redactEmails(sql: string): string {
  return SqlStringLiterals.replace(sql, (value) => {
    return value.includes("@") ? "'<redacted>'" : undefined;
  });
}

describe("SqlStringLiterals.replace", () => {
  it("replaces a chosen literal and keeps the others", () => {
    const sql = `SELECT * FROM t WHERE "email" = 'jane@example.com' AND "state" = 'Texas'`;

    expect(_redactEmails(sql)).toBe(
      `SELECT * FROM t WHERE "email" = '<redacted>' AND "state" = 'Texas'`,
    );
  });

  it("reads a doubled quote as part of the literal", () => {
    const sql = `SELECT 'O''Brien@example.com' AS a, 'O''Hara' AS b`;

    expect(_redactEmails(sql)).toBe(`SELECT '<redacted>' AS a, 'O''Hara' AS b`);
  });

  it("skips quotes inside double-quoted identifiers and comments", () => {
    const sql = `SELECT "owner's email" FROM t -- owner's\nWHERE "owner's email" = 'a@b.co' /* it's */`;

    expect(_redactEmails(sql)).toBe(
      `SELECT "owner's email" FROM t -- owner's\nWHERE "owner's email" = '<redacted>' /* it's */`,
    );
  });

  it("reads an unterminated literal to the end of the SQL", () => {
    expect(_redactEmails(`SELECT 'a@b.co`)).toBe(`SELECT '<redacted>'`);
    expect(_redactEmails(`SELECT 'Texas`)).toBe(`SELECT 'Texas`);
  });
});

describe("SqlStringLiterals.getValues", () => {
  it("lists literal values with doubled quotes unescaped", () => {
    expect(
      SqlStringLiterals.getValues(`SELECT 'it''s', "x'y" FROM t WHERE a = 'b'`),
    ).toEqual(["it's", "b"]);
  });
});

describe("SqlStringLiterals.quote", () => {
  it("writes a value as a literal, doubling its quotes", () => {
    expect(SqlStringLiterals.quote("O'Brien")).toBe("'O''Brien'");
  });
});
