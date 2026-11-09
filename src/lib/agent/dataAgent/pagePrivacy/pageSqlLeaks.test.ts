/**
 * Page SQL written to slip a personal value past redaction, each checked
 * with the detectors the browser uses: the value must not survive in what
 * the model reads, and ordinary filters must still read as written.
 */
import { describe, expect, it } from "vitest";
import { isPersonalDataText } from "@/components/privacy/privacy-helpers/detectPii/detectPii";
import { isPersonalColumnName } from "@/lib/agent/dataAgent/pagePrivacy/isPersonalColumnName";
import { createSqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";
import type { SqlLiteralDetectors } from "@/lib/agent/dataAgent/pagePrivacy/findSensitiveSqlLiterals";

const DETECTORS: SqlLiteralDetectors = {
  isSensitiveColumn: isPersonalColumnName,
  isSensitiveValue: isPersonalDataText,
  knownColumnNames: new Set(
    [
      "name",
      "patient_name",
      "first_name",
      "last_name",
      "First Name",
      "firstName",
      "Surname",
      "dob",
      "ssn",
      "patient_id",
      "phone",
      "x",
      "y",
      "vaccine",
      "vaccination_status",
      "stage",
      "Province_State",
      "county",
      "Population",
    ].map((name) => {
      return name.toLowerCase();
    }),
  ),
};

function _redact(sql: string): string {
  return createSqlPlaceholderVault().redact(sql, DETECTORS);
}

describe("page SQL redaction", () => {
  it.each([
    ["=", `SELECT * FROM t WHERE "patient_name" = 'Jane'`, "Jane"],
    [
      "CTE alias",
      `WITH x AS (SELECT "patient_name" AS n FROM t) SELECT * FROM x WHERE n = 'Jane'`,
      "Jane",
    ],
    [
      "subquery alias",
      `SELECT * FROM (SELECT "patient_name" AS n FROM t) s WHERE s.n = 'Jane'`,
      "Jane",
    ],
    [
      "searched CASE",
      `SELECT CASE WHEN "name" = 'Jane' THEN 1 ELSE 0 END AS f FROM t`,
      "Jane",
    ],
    [
      "simple CASE",
      `SELECT CASE "name" WHEN 'Jane' THEN 1 ELSE 0 END AS f FROM t`,
      "Jane",
    ],
    [
      "IN subquery",
      `SELECT * FROM t WHERE "name" IN (SELECT "x" FROM u WHERE "y" = 'Jane')`,
      "Jane",
    ],
    [
      "concat()",
      `SELECT * FROM t WHERE concat("first_name", ' ', "last_name") = 'Jane Doe'`,
      "Jane Doe",
    ],
    [
      "|| concat",
      `SELECT * FROM t WHERE "first_name" || ' ' || "last_name" = 'Jane Doe'`,
      "Jane Doe",
    ],
    [
      "ORDER BY CASE",
      `SELECT * FROM t ORDER BY CASE WHEN "name" = 'Jane' THEN 0 ELSE 1 END`,
      "Jane",
    ],
    ["LIKE", `SELECT * FROM t WHERE "name" LIKE '%Jane%'`, "Jane"],
    [
      "starts_with()",
      `SELECT * FROM t WHERE starts_with("name", 'Jane')`,
      "Jane",
    ],
    ["contains()", `SELECT * FROM t WHERE contains("name", 'Jane')`, "Jane"],
    [
      "regexp_matches()",
      `SELECT * FROM t WHERE regexp_matches("name", 'Jane')`,
      "Jane",
    ],
    ["~", `SELECT * FROM t WHERE "name" ~ 'Jane'`, "Jane"],
    [
      "BETWEEN",
      `SELECT * FROM t WHERE "last_name" BETWEEN 'Doe' AND 'Dof'`,
      "Doe",
    ],
    [">=", `SELECT * FROM t WHERE "last_name" >= 'Doe'`, "Doe"],
    [
      "IS NOT DISTINCT FROM",
      `SELECT * FROM t WHERE "name" IS NOT DISTINCT FROM 'Jane'`,
      "Jane",
    ],
    [
      "coalesce()",
      `SELECT * FROM t WHERE coalesce("name", 'Jane') = 'x'`,
      "Jane",
    ],
    [
      "line comment",
      `SELECT * FROM t -- Jane Doe\nWHERE "name" = 'x'`,
      "Jane Doe",
    ],
    ["block comment", `SELECT * /* patient Jane Doe */ FROM t`, "Jane Doe"],
    ["dollar-quoted", `SELECT * FROM t WHERE "name" = $$Jane$$`, "Jane"],
    ["E'' string", `SELECT * FROM t WHERE "name" = E'Jane'`, "Jane"],
    [
      "E'' escaped quote",
      `SELECT * FROM t WHERE "name" = E'O\\'Brien'`,
      "Brien",
    ],
    ["unquoted column", `SELECT * FROM t WHERE patient_name = 'Jane'`, "Jane"],
    [
      "qualified column",
      `SELECT * FROM t WHERE t."patient_name" = 'Jane'`,
      "Jane",
    ],
    [
      "First Name header",
      `SELECT * FROM t WHERE "First Name" = 'Jane'`,
      "Jane",
    ],
    ["firstName header", `SELECT * FROM t WHERE "firstName" = 'Jane'`, "Jane"],
    ["Surname header", `SELECT * FROM t WHERE "Surname" = 'Doe'`, "Doe"],
    [
      "GROUP BY ALL",
      `SELECT "name", count(*) FROM t WHERE "name" = 'Jane' GROUP BY ALL`,
      "Jane",
    ],
    [
      "DATE literal",
      `SELECT * FROM t WHERE "dob" = DATE '1990-05-12'`,
      "1990-05-12",
    ],
    [
      "date string on dob",
      `SELECT * FROM t WHERE "dob" = '1990-05-12'`,
      "1990-05-12",
    ],
    ["cast", `SELECT * FROM t WHERE "name" = 'Jane'::VARCHAR`, "Jane"],
    ["JOIN ON", `SELECT * FROM t JOIN u ON t."patient_name" = 'Jane'`, "Jane"],
    ["list literal", `SELECT * FROM t WHERE "name" IN ['Jane']`, "Jane"],
    ["U&'' string", `SELECT * FROM t WHERE "name" = U&'Jane'`, "Jane"],
    ["two literals", `SELECT * FROM t WHERE "name" = 'Ja' || 'ne'`, "Ja"],
    [
      "two statements",
      `SELECT 1; SELECT * FROM t WHERE "name" = 'Jane'`,
      "Jane",
    ],
    [
      "list_contains()",
      `SELECT * FROM t WHERE list_contains(["name"], 'Jane')`,
      "Jane",
    ],
    ["QUALIFY", `SELECT * FROM t QUALIFY "name" = 'Jane'`, "Jane"],
    ["number on ssn", `SELECT * FROM t WHERE "ssn" = 123456789`, "123456789"],
    [
      "number on patient_id",
      `SELECT * FROM t WHERE "patient_id" = 48213`,
      "48213",
    ],
    [
      "number on phone",
      `SELECT * FROM t WHERE "phone" = 5551234567`,
      "5551234567",
    ],
    [
      "ANY(ARRAY[])",
      `SELECT * FROM t WHERE "name" = ANY(ARRAY['Jane'])`,
      "Jane",
    ],
    ["GLOB", `SELECT * FROM t WHERE "name" GLOB 'Ja*'`, "Ja*"],
    ["SIMILAR TO", `SELECT * FROM t WHERE "name" SIMILAR TO 'Jane%'`, "Jane"],
    [
      "jaro_winkler",
      `SELECT * FROM t WHERE jaro_winkler_similarity("name", 'Jane') > 0.9`,
      "Jane",
    ],
    [
      "VALUES join",
      `SELECT * FROM t JOIN (VALUES ('Jane')) v(n) ON t."name" = v.n`,
      "Jane",
    ],
    ["COLLATE", `SELECT * FROM t WHERE "name" = 'Jane' COLLATE nocase`, "Jane"],
    ["COLUMNS()", `SELECT * FROM t WHERE COLUMNS('name') = 'Jane'`, "Jane"],
    [
      "FILTER clause",
      `SELECT count(*) FILTER (WHERE "name" = 'Jane') FROM t`,
      "Jane",
    ],
    ["replace()", `SELECT replace("name", 'Jane', 'X') FROM t`, "Jane"],
    ["struct field", `SELECT * FROM t WHERE "patient"."name" = 'Jane'`, "Jane"],
  ])("hides the value in %s", (_label, sql, secret) => {
    expect(_redact(sql)).not.toContain(secret);
  });

  it.each([
    ["vaccine", `SELECT * FROM t WHERE "vaccine" = 'MMR'`, "'MMR'"],
    [
      "vaccination_status",
      `SELECT * FROM t WHERE "vaccination_status" = 'Unvaccinated'`,
      "'Unvaccinated'",
    ],
    ["stage", `SELECT * FROM t WHERE "stage" = 'Confirmed'`, "'Confirmed'"],
    [
      "Province_State",
      `SELECT * FROM t WHERE "Province_State" = 'Texas'`,
      "'Texas'",
    ],
    ["county", `SELECT * FROM t WHERE "county" = 'Kings'`, "'Kings'"],
    ["Population", `SELECT * FROM t WHERE "Population" > 100000`, "100000"],
  ])("keeps an ordinary filter on %s", (_label, sql, kept) => {
    expect(_redact(sql)).toContain(kept);
  });
});
