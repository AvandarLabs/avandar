import { describe, expect, it } from "vitest";
import { QueryFilterValidation } from "$/models/queries/StructuredQuery/QueryFilterValidation/QueryFilterValidation.ts";
import type { QueryFilterRule } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

function _rule(overrides: Partial<QueryFilterRule> = {}): QueryFilterRule {
  return {
    type: "rule",
    columnName: "Admin2",
    columnDataType: "varchar",
    operator: "=",
    value: "Alameda",
    ...overrides,
  };
}

describe("QueryFilterValidation.isRuleComplete", () => {
  it("requires a value for scalar operators", () => {
    expect(QueryFilterValidation.isRuleComplete(_rule())).toBe(true);
    expect(QueryFilterValidation.isRuleComplete(_rule({ value: "" }))).toBe(
      false,
    );
    expect(QueryFilterValidation.isRuleComplete(_rule({ value: null }))).toBe(
      false,
    );
  });

  it("requires at least one item for list operators", () => {
    expect(
      QueryFilterValidation.isRuleComplete(
        _rule({ operator: "in", value: ["a"] }),
      ),
    ).toBe(true);
    expect(
      QueryFilterValidation.isRuleComplete(
        _rule({ operator: "in", value: [] }),
      ),
    ).toBe(false);
    expect(
      QueryFilterValidation.isRuleComplete(
        _rule({ operator: "in", value: "" }),
      ),
    ).toBe(false);
  });

  it("requires both bounds for between", () => {
    const numeric = { columnName: "cases", columnDataType: "bigint" } as const;
    expect(
      QueryFilterValidation.isRuleComplete(
        _rule({ ...numeric, operator: "between", value: [1, 2] }),
      ),
    ).toBe(true);
    expect(
      QueryFilterValidation.isRuleComplete(
        _rule({ ...numeric, operator: "between", value: [1] }),
      ),
    ).toBe(false);
  });

  it("requires nothing for null-ish and boolean operators", () => {
    expect(
      QueryFilterValidation.isRuleComplete(
        _rule({ operator: "is_null", value: null }),
      ),
    ).toBe(true);
    expect(
      QueryFilterValidation.isRuleComplete(
        _rule({
          columnName: "flag",
          columnDataType: "boolean",
          operator: "is_true",
          value: null,
        }),
      ),
    ).toBe(true);
  });

  it("treats an empty column name as incomplete", () => {
    expect(
      QueryFilterValidation.isRuleComplete(_rule({ columnName: "" })),
    ).toBe(false);
  });
});

describe("QueryFilterValidation.validateRule", () => {
  it("accepts a well-formed rule", () => {
    expect(QueryFilterValidation.validateRule(_rule())).toBeUndefined();
  });

  it("rejects an operator the column type does not support", () => {
    expect(
      QueryFilterValidation.validateRule(
        _rule({ columnDataType: "bigint", operator: "contains" }),
      ),
    ).toEqual({
      code: "operatorNotAllowedForType",
      operator: "contains",
      dataType: "bigint",
    });
  });

  it("rejects a non-numeric value on a numeric column", () => {
    expect(
      QueryFilterValidation.validateRule(
        _rule({ columnName: "cases", columnDataType: "bigint", value: "abc" }),
      ),
    ).toEqual({ code: "valueNotANumber", value: "abc" });
  });

  it("rejects an unparseable date on a temporal column", () => {
    expect(
      QueryFilterValidation.validateRule(
        _rule({ columnName: "date", columnDataType: "date", value: "nope" }),
      ),
    ).toEqual({ code: "valueNotADate", value: "nope" });
  });

  it("accepts an ISO date on a temporal column", () => {
    expect(
      QueryFilterValidation.validateRule(
        _rule({
          columnName: "date",
          columnDataType: "date",
          value: "2020-05-01",
        }),
      ),
    ).toBeUndefined();
  });

  it("rejects a regex that does not compile", () => {
    expect(
      QueryFilterValidation.validateRule(
        _rule({ operator: "matches_regex", value: "a(" }),
      ),
    ).toEqual({ code: "regexDoesNotCompile", value: "a(" });
  });

  it("reports reversed between bounds", () => {
    expect(
      QueryFilterValidation.validateRule(
        _rule({
          columnName: "cases",
          columnDataType: "bigint",
          operator: "between",
          value: [200, 100],
        }),
      ),
    ).toEqual({ code: "betweenBoundsReversed" });
  });

  it("does not validate values of incomplete rules", () => {
    expect(
      QueryFilterValidation.validateRule(_rule({ value: "" })),
    ).toBeUndefined();
  });
});
