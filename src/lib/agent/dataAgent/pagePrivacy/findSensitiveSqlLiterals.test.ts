import { describe, expect, it } from "vitest";
import { findSensitiveSqlLiterals } from "@/lib/agent/dataAgent/pagePrivacy/findSensitiveSqlLiterals";
import type { SqlLiteralDetectors } from "@/lib/agent/dataAgent/pagePrivacy/findSensitiveSqlLiterals";

const DETECTORS: SqlLiteralDetectors = {
  isSensitiveColumn: (columnName) => {
    return /name|email/i.test(columnName);
  },
  isSensitiveValue: (value) => {
    return value.includes("@");
  },
};

const TABLE = '"0b1c2d3e-1111-4111-8111-aaaaaaaaaaaa"';

function _find(sql: string): string[] | "all" {
  const found = findSensitiveSqlLiterals(sql, DETECTORS);
  return found === "all" ? "all" : [...found].sort();
}

describe("findSensitiveSqlLiterals", () => {
  it.each([
    ["=", `"patient_name" = 'Jane'`],
    ["<>", `"patient_name" <> 'Jane'`],
    ["!=", `"patient_name" != 'Jane'`],
    ["LIKE", `"patient_name" LIKE 'Jane'`],
    ["NOT LIKE", `"patient_name" NOT LIKE 'Jane'`],
    ["ILIKE", `"patient_name" ILIKE 'Jane'`],
    ["NOT ILIKE", `"patient_name" NOT ILIKE 'Jane'`],
    ["IN", `"patient_name" IN ('Jane')`],
    ["NOT IN", `"patient_name" NOT IN ('Jane')`],
  ])("finds a literal compared with %s", (_operator, condition) => {
    expect(_find(`SELECT * FROM ${TABLE} WHERE ${condition}`)).toEqual([
      "Jane",
    ]);
  });

  it("finds a literal on either side of the comparison", () => {
    expect(_find(`SELECT * FROM t WHERE 'Jane' = "patient_name"`)).toEqual([
      "Jane",
    ]);
  });

  it("reads unquoted, quoted, and qualified columns", () => {
    const sql = `SELECT * FROM t AS t0 WHERE name = 'A' OR t."name" = 'B' OR "t0"."patient_name" IN ('C', 'D') OR t0.email = 'E'`;

    expect(_find(sql)).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("finds a literal compared with a function of the column", () => {
    expect(
      _find(`SELECT * FROM t WHERE lower("patient_name") LIKE '%doe%'`),
    ).toEqual(["%doe%"]);
  });

  it("finds comparisons in CTEs, CASE, and HAVING", () => {
    const sql = `WITH a AS (SELECT * FROM t WHERE name = 'A') SELECT CASE WHEN name = 'B' THEN 1 END FROM a HAVING name = 'C'`;

    expect(_find(sql)).toEqual(["A", "B", "C"]);
  });

  it("unescapes doubled quotes in a found value", () => {
    expect(_find(`SELECT * FROM t WHERE "name" = 'O''Brien'`)).toEqual([
      "O'Brien",
    ]);
  });

  it("leaves literals compared with other columns", () => {
    const sql = `SELECT date_trunc('month', "date") FROM ${TABLE} WHERE "Province_State" = 'Texas' AND "date" >= '2022-01-01' AND year("date") = 2022`;

    expect(_find(sql)).toEqual([]);
  });

  it("leaves numbers compared with a personal column", () => {
    expect(_find(`SELECT * FROM t WHERE "name" = 42`)).toEqual([]);
  });

  it("finds a literal whose value looks personal wherever it is", () => {
    expect(
      _find(`SELECT * FROM t WHERE "state" = 'Texas' OR "x" = 'a@b.co'`),
    ).toEqual(["a@b.co"]);
  });

  it("returns all literals when the SQL cannot be parsed", () => {
    expect(
      _find(
        `SELECT "state", COUNT(*) FROM t WHERE "state" = 'Texas' GROUP BY ALL`,
      ),
    ).toBe("all");
  });

  it("returns no literals for blank SQL", () => {
    expect(_find("  ")).toEqual([]);
  });
});
