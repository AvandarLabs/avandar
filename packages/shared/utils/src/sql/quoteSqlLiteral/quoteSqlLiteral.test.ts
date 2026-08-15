import { quoteSqlLiteral } from "@utils/sql/quoteSqlLiteral/quoteSqlLiteral.ts";
import { describe, expect, it } from "vitest";

describe("quoteSqlLiteral", () => {
  it("wraps a plain value in single quotes", () => {
    expect(quoteSqlLiteral("Nord-Kivu")).toBe("'Nord-Kivu'");
  });

  it("doubles an embedded single quote", () => {
    expect(quoteSqlLiteral("O'Brien")).toBe("'O''Brien'");
  });

  it("doubles every single quote, not just the first", () => {
    expect(quoteSqlLiteral("a'b'c")).toBe("'a''b''c'");
  });

  it("closes the injection attempt rather than ending the literal", () => {
    expect(quoteSqlLiteral("'; drop table t; --")).toBe(
      "'''; drop table t; --'",
    );
  });

  it("quotes an empty value", () => {
    expect(quoteSqlLiteral("")).toBe("''");
  });

  it("leaves a backslash alone, since SQL literals do not escape with it", () => {
    expect(quoteSqlLiteral("a\\b")).toBe("'a\\b'");
  });
});
