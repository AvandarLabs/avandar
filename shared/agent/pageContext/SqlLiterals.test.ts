import { describe, expect, it } from "vitest";
import { SqlLiterals } from "$/agent/pageContext/SqlLiterals.ts";

function _redactEmails(sql: string): string {
  return SqlLiterals.replace(sql, (literal) => {
    return literal.value.includes("@") ? "'<redacted>'" : undefined;
  });
}

function _kindsAndValues(sql: string): string[] {
  return SqlLiterals.list(sql).map((literal) => {
    return `${literal.kind}:${literal.value}`;
  });
}

describe("SqlLiterals.replace", () => {
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

describe("SqlLiterals.list", () => {
  it("lists strings with doubled quotes unescaped", () => {
    expect(
      _kindsAndValues(`SELECT 'it''s', "x'y" FROM t WHERE a = 'b'`),
    ).toEqual(["string:it's", "string:b"]);
  });

  it("lists numbers, but not digits inside names", () => {
    expect(
      _kindsAndValues(
        `SELECT "c1", t0.x, 1.50 FROM "t0" WHERE n = -48213 AND y = 2e3`,
      ),
    ).toEqual(["number:1.5", "number:48213", "number:2000"]);
  });

  it("keeps large integers exact and reads leading zeros", () => {
    expect(
      _kindsAndValues(`SELECT 12345678901234567891, 007, 5.551234567e9`),
    ).toEqual(["number:12345678901234567891", "number:7", "number:5551234567"]);
  });

  it("lists escape strings and dollar-quoted strings as their own kinds", () => {
    expect(
      _kindsAndValues(`SELECT E'O\\'Brien', $$Jane$$, $tag$Ann$tag$, typE`),
    ).toEqual([
      "escapeString:O'Brien",
      "dollarString:Jane",
      "dollarString:Ann",
    ]);
  });
});

describe("SqlLiterals.listIdentifiers", () => {
  it("lists quoted identifiers and words, but no literal or comment text", () => {
    expect(
      SqlLiterals.listIdentifiers(
        `SELECT "First Name", t0.age FROM t -- dob\nWHERE x = 'ssn'`,
      ),
    ).toEqual(["SELECT", "First Name", "t0", "age", "FROM", "t", "WHERE", "x"]);
  });
});

describe("SqlLiterals.stripComments", () => {
  it("replaces comments with a space and keeps literals that look like them", () => {
    expect(
      SqlLiterals.stripComments(
        `SELECT '--x' AS a -- Jane Doe\nFROM t /* Jane */ WHERE b = 1`,
      ),
    ).toBe(`SELECT '--x' AS a  \nFROM t   WHERE b = 1`);
  });
});

describe("SqlLiterals.getKey", () => {
  it("keeps numbers apart from strings with the same text", () => {
    const [number, string] = SqlLiterals.list(`SELECT 48213, '48213'`);

    expect(SqlLiterals.getKey(number!)).toBe("n:48213");
    expect(SqlLiterals.getKey(string!)).toBe("s:48213");
  });
});

describe("SqlLiterals.quote", () => {
  it("writes a value as a literal, doubling its quotes", () => {
    expect(SqlLiterals.quote("O'Brien")).toBe("'O''Brien'");
  });
});
