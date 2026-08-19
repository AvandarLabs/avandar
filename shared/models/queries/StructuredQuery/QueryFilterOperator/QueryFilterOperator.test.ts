import { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilterOperator/QueryFilterOperator.ts";
import { describe, expect, it } from "vitest";

describe("QueryFilterOperator.getForDataType", () => {
  it("offers text operators for varchar and not numeric ranges", () => {
    const operators = QueryFilterOperator.getForDataType("varchar");
    expect(operators).toContain("contains");
    expect(operators).toContain("starts_with");
    expect(operators).toContain("is_blank");
    expect(operators).not.toContain("between");
    expect(operators).not.toContain("is_true");
  });

  it("offers range operators for numbers and not text matching", () => {
    const operators = QueryFilterOperator.getForDataType("bigint");
    expect(operators).toContain("between");
    expect(operators).toContain("not_between");
    expect(operators).toContain(">=");
    expect(operators).not.toContain("contains");
    expect(operators).not.toContain("is_blank");
  });

  it("offers range operators for temporal types", () => {
    expect(QueryFilterOperator.getForDataType("date")).toContain("between");
    expect(QueryFilterOperator.getForDataType("timestamp")).toContain(">");
    expect(QueryFilterOperator.getForDataType("time")).toContain("<=");
  });

  it("offers boolean operators only for boolean", () => {
    expect(QueryFilterOperator.getForDataType("boolean")).toContain("is_true");
    expect(QueryFilterOperator.getForDataType("boolean")).toContain("is_false");
    expect(QueryFilterOperator.getForDataType("varchar")).not.toContain(
      "is_true",
    );
  });

  it("offers null checks for every type", () => {
    (
      [
        "varchar",
        "bigint",
        "double",
        "date",
        "timestamp",
        "time",
        "boolean",
      ] as const
    ).forEach((dataType) => {
      expect(QueryFilterOperator.getForDataType(dataType)).toContain("is_null");
      expect(QueryFilterOperator.getForDataType(dataType)).toContain(
        "is_not_null",
      );
    });
  });

  it("never offers legacy operators", () => {
    expect(QueryFilterOperator.getForDataType("varchar")).not.toContain("like");
    expect(QueryFilterOperator.getForDataType("varchar")).not.toContain(
      "not_like",
    );
  });
});
