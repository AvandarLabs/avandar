import { describe, expect, it } from "vitest";
import { findSensitiveSqlLiterals } from "@/lib/agent/dataAgent/pagePrivacy/findSensitiveSqlLiterals";
import type { SqlLiteralDetectors } from "@/lib/agent/dataAgent/pagePrivacy/findSensitiveSqlLiterals";

const DETECTORS: SqlLiteralDetectors = {
  isSensitiveColumn: (columnName) => {
    return /name|email|_id/i.test(columnName);
  },
  isSensitiveValue: (value) => {
    return value.includes("@");
  },
};

/** The page's dataset columns, so other column references fail closed. */
const KNOWN_COLUMNS = new Set([
  "patient_name",
  "name",
  "email",
  "patient_id",
  "state",
  "date",
  "x",
  "y",
]);

const TABLE = '"0b1c2d3e-1111-4111-8111-aaaaaaaaaaaa"';

function _find(
  sql: string,
  detectors: SqlLiteralDetectors = DETECTORS,
): string[] | "all" {
  const found = findSensitiveSqlLiterals(sql, detectors);
  return found.kind === "unread" ? "all" : [...found.reasons.keys()].sort();
}

/** Each found literal's key and why it was found. */
function _findReasons(sql: string): Record<string, string> {
  const found = findSensitiveSqlLiterals(sql, DETECTORS);
  return found.kind === "unread" ? {} : Object.fromEntries(found.reasons);
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
    [">=", `"patient_name" >= 'Jane'`],
    ["~", `"patient_name" ~ 'Jane'`],
    ["SIMILAR TO", `"patient_name" SIMILAR TO 'Jane'`],
    ["BETWEEN", `"patient_name" BETWEEN 'Jane' AND 'Jane'`],
    ["= ANY(ARRAY[...])", `"patient_name" = ANY(ARRAY['Jane'])`],
    ["NOT (...)", `NOT ("patient_name" = 'Jane')`],
  ])("finds a literal compared with %s", (_operator, condition) => {
    expect(_find(`SELECT * FROM ${TABLE} WHERE ${condition}`)).toEqual([
      "s:Jane",
    ]);
  });

  it("finds a literal on either side of the comparison", () => {
    expect(_find(`SELECT * FROM t WHERE 'Jane' = "patient_name"`)).toEqual([
      "s:Jane",
    ]);
  });

  it("reads unquoted, quoted, and qualified columns", () => {
    const sql = `SELECT * FROM t AS t0 WHERE name = 'A' OR t."name" = 'B' OR "t0"."patient_name" IN ('C', 'D') OR t0.email = 'E'`;

    expect(_find(sql)).toEqual(["s:A", "s:B", "s:C", "s:D", "s:E"]);
  });

  it.each([
    ["lower() LIKE", `lower("patient_name") LIKE '%doe%'`, "s:%doe%"],
    ["starts_with()", `starts_with("name", 'Jane')`, "s:Jane"],
    ["contains()", `contains("name", 'Jane')`, "s:Jane"],
    ["regexp_matches()", `regexp_matches("name", 'Jane')`, "s:Jane"],
    ["jaro_winkler", `jaro_winkler_similarity("name", 'Jane') > 0`, "s:Jane"],
    ["concat()", `concat("name", 'Jane') = 'x'`, "s:Jane"],
  ])(
    "finds a literal in a function of the column: %s",
    (_label, condition, key) => {
      expect(_find(`SELECT * FROM t WHERE ${condition}`)).toContain(key);
    },
  );

  it("finds literals in simple and searched CASE and in ORDER BY", () => {
    const sql = `SELECT CASE "name" WHEN 'A' THEN 1 END AS a, CASE WHEN "name" = 'B' THEN 2 END AS b FROM t ORDER BY CASE WHEN "name" = 'C' THEN 0 END`;

    expect(_find(sql)).toEqual(expect.arrayContaining(["s:A", "s:B", "s:C"]));
  });

  it("finds comparisons in CTEs, HAVING, FILTER, and JOIN ON", () => {
    const sql = `WITH a AS (SELECT * FROM t WHERE name = 'A') SELECT count(*) FILTER (WHERE name = 'B') FROM a JOIN u ON a."name" = 'C' HAVING max(name) = 'D'`;

    expect(_find(sql)).toEqual(
      expect.arrayContaining(["s:A", "s:B", "s:C", "s:D"]),
    );
  });

  it("treats a column that is not in the page's datasets as personal", () => {
    const detectors = { ...DETECTORS, knownColumnNames: KNOWN_COLUMNS };
    const cte = `WITH x AS (SELECT "patient_name" AS n FROM t) SELECT * FROM x WHERE n = 'Jane'`;
    const subquery = `SELECT * FROM (SELECT "patient_name" AS n FROM t) s WHERE s.n = 'Ann'`;

    expect(_find(cte, detectors)).toEqual(["s:Jane"]);
    expect(_find(subquery, detectors)).toEqual(["s:Ann"]);
    expect(_find(`SELECT * FROM t WHERE "STATE" = 'Texas'`, detectors)).toEqual(
      [],
    );
  });

  it("treats an alias of a personal column as personal, even with a known name", () => {
    const detectors = { ...DETECTORS, knownColumnNames: KNOWN_COLUMNS };

    expect(
      _find(
        `WITH x AS (SELECT "patient_name" AS "state" FROM t) SELECT * FROM x WHERE "state" = 'Jane'`,
        detectors,
      ),
    ).toEqual(["s:Jane"]);
  });

  it("finds every literal in a VALUES list", () => {
    expect(
      _find(`SELECT * FROM t JOIN (VALUES ('Jane')) v(n) ON t."name" = v.n`),
    ).toEqual(["s:Jane"]);
  });

  it("finds a literal compared with COLUMNS(), which picks columns by name", () => {
    expect(_find(`SELECT * FROM t WHERE COLUMNS('name') = 'Jane'`)).toContain(
      "s:Jane",
    );
  });

  it("finds typed literals compared with a personal column", () => {
    expect(
      _find(`SELECT * FROM t WHERE "patient_name" = DATE '1990-05-12'`),
    ).toEqual(["s:1990-05-12"]);
  });

  it("finds numbers compared with a personal column", () => {
    expect(
      _find(`SELECT * FROM t WHERE "patient_id" = 48213 OR "patient_id" = -7`),
    ).toEqual(["n:48213", "n:7"]);
  });

  it("finds large integers and exponent numbers the parser types as bigint", () => {
    expect(
      _find(
        `SELECT * FROM t WHERE "patient_id" = 12345678901234567891 OR "patient_id" = 5.551234567e9`,
      ),
    ).toEqual(["n:12345678901234567891", "n:5551234567"]);
  });

  it("reads all literals when the parser loses a number's digits", () => {
    expect(
      _find(`SELECT * FROM t WHERE "patient_id" = -9007199254740993`),
    ).toBe("all");
  });

  it("says a direct operand of a comparison was compared", () => {
    expect(
      _findReasons(
        `SELECT * FROM t WHERE "name" = 'A' OR "name" IN ('B', 'C'::VARCHAR) OR "name" LIKE '%D%' OR "name" BETWEEN 'E' AND 'F' OR "x" = 'a@b.co'`,
      ),
    ).toEqual({
      "s:A": "compared",
      "s:B": "compared",
      "s:C": "compared",
      "s:%D%": "compared",
      "s:E": "compared",
      "s:F": "compared",
      "s:a@b.co": "compared",
    });
  });

  it("says a value compared with a column through case or joining functions was compared", () => {
    expect(
      _findReasons(
        `SELECT * FROM t WHERE lower(trim("name")) = 'jane' OR concat("name", ' ', "x") = 'Jane Doe' OR "name" || 'x' = 'Ann'`,
      ),
    ).toMatchObject({
      "s:jane": "compared",
      "s:Jane Doe": "compared",
      "s:Ann": "compared",
      "s: ": "swept",
    });
  });

  it("says a value a simple CASE tests the column against was compared", () => {
    expect(
      _findReasons(`SELECT CASE "name" WHEN 'A' THEN 'yes' END AS f FROM t`),
    ).toEqual({ "s:A": "compared", "s:yes": "swept" });
  });

  it("says any other literal in a personal expression was swept", () => {
    expect(
      _findReasons(
        `SELECT date_trunc('month', "name"), CASE WHEN "name" IS NULL THEN 'No' ELSE 'Yes' END FROM t WHERE year("name") = 2022`,
      ),
    ).toEqual({
      "s:month": "swept",
      "s:No": "swept",
      "s:Yes": "swept",
      "n:2022": "swept",
    });
  });

  it("keeps small numbers in unreadable SQL only without a personal column", () => {
    const unread = (sql: string) => {
      return findSensitiveSqlLiterals(sql, DETECTORS);
    };

    expect(
      unread(`SELECT "state", count(*) FROM t WHERE "x" = 3 GROUP BY ALL`),
    ).toEqual({ kind: "unread", keepsSmallNumbers: true });
    expect(
      unread(
        `SELECT "state", count(*) FROM t WHERE "patient_id" = 42 GROUP BY ALL`,
      ),
    ).toEqual({ kind: "unread", keepsSmallNumbers: false });
  });

  it("unescapes doubled quotes in a found value", () => {
    expect(_find(`SELECT * FROM t WHERE "name" = 'O''Brien'`)).toEqual([
      "s:O'Brien",
    ]);
  });

  it("leaves literals compared with other columns", () => {
    const sql = `SELECT date_trunc('month', "date") FROM ${TABLE} WHERE "state" = 'Texas' AND "date" >= '2022-01-01' AND year("date") = 2022 LIMIT 10`;

    expect(_find(sql)).toEqual([]);
  });

  it("finds a literal whose value looks personal wherever it is", () => {
    expect(
      _find(`SELECT * FROM t WHERE "state" = 'Texas' OR "x" = 'a@b.co'`),
    ).toEqual(["s:a@b.co"]);
  });

  it.each([
    [
      "GROUP BY ALL",
      `SELECT "state" FROM t WHERE "state" = 'Texas' GROUP BY ALL`,
    ],
    ["an E'' string", `SELECT * FROM t WHERE "state" = E'Texas'`],
    ["a dollar-quoted string", `SELECT * FROM t WHERE "state" = $$Texas$$`],
    [
      "IS NOT DISTINCT FROM",
      `SELECT * FROM t WHERE "name" IS NOT DISTINCT FROM 'J'`,
    ],
  ])("returns all literals for %s", (_label, sql) => {
    expect(_find(sql)).toBe("all");
  });

  it("returns no literals for blank SQL", () => {
    expect(_find("  ")).toEqual([]);
  });
});
