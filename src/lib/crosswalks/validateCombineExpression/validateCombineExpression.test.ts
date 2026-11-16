import { describe, expect, it } from "vitest";
import { validateCombineExpression } from "@/lib/crosswalks/validateCombineExpression/validateCombineExpression";

const COLUMN_NAMES = ["Case No", "first_name", "last_name", "Year"];

describe("validateCombineExpression", () => {
  it("accepts one expression over the layout's columns, matched ignoring case", () => {
    expect(
      validateCombineExpression({
        sql: "concat({case no}, '-', {YEAR})",
        columnNames: COLUMN_NAMES,
      }),
    ).toEqual({ isValid: true });
  });

  it("refuses an empty expression", () => {
    expect(
      validateCombineExpression({ sql: "   ", columnNames: COLUMN_NAMES }),
    ).toEqual({ isValid: false, reason: "empty" });
  });

  it("names the first placeholder that is not one of the layout's columns", () => {
    expect(
      validateCombineExpression({
        sql: "concat({first_name}, ' ', {surname}, {nickname})",
        columnNames: COLUMN_NAMES,
      }),
    ).toEqual({
      isValid: false,
      reason: "unknown_column",
      columnName: "surname",
    });
  });

  it.each([
    ["two expressions", "{first_name}, {last_name}"],
    ["a subquery", "(SELECT 1)"],
    ["a statement break", "{first_name}; DROP TABLE x"],
    ["a file read", "read_csv('/etc/passwd')"],
    ["an alias", "{first_name} AS name"],
  ])("refuses %s as invalid SQL", (_label, sql) => {
    expect(
      validateCombineExpression({ sql, columnNames: COLUMN_NAMES }),
    ).toEqual({ isValid: false, reason: "invalid_sql" });
  });
});
