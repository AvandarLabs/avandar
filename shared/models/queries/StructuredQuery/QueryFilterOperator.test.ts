import {
  operatorsForDataType,
  operatorSpec,
  QUERY_FILTER_OPERATOR_SPECS,
} from "$/models/queries/StructuredQuery/QueryFilterOperator.ts";
import { describe, expect, it } from "vitest";

describe("operatorsForDataType", () => {
  it("offers text operators for varchar and not numeric ranges", () => {
    const operators = operatorsForDataType("varchar");
    expect(operators).toContain("contains");
    expect(operators).toContain("starts_with");
    expect(operators).toContain("is_blank");
    expect(operators).not.toContain("between");
    expect(operators).not.toContain("is_true");
  });

  it("offers range operators for numbers and not text matching", () => {
    const operators = operatorsForDataType("bigint");
    expect(operators).toContain("between");
    expect(operators).toContain("not_between");
    expect(operators).toContain(">=");
    expect(operators).not.toContain("contains");
    expect(operators).not.toContain("is_blank");
  });

  it("offers range operators for temporal types", () => {
    expect(operatorsForDataType("date")).toContain("between");
    expect(operatorsForDataType("timestamp")).toContain(">");
    expect(operatorsForDataType("time")).toContain("<=");
  });

  it("offers boolean operators only for boolean", () => {
    expect(operatorsForDataType("boolean")).toContain("is_true");
    expect(operatorsForDataType("boolean")).toContain("is_false");
    expect(operatorsForDataType("varchar")).not.toContain("is_true");
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
      expect(operatorsForDataType(dataType)).toContain("is_null");
      expect(operatorsForDataType(dataType)).toContain("is_not_null");
    });
  });

  it("never offers legacy operators", () => {
    expect(operatorsForDataType("varchar")).not.toContain("like");
    expect(operatorsForDataType("varchar")).not.toContain("not_like");
  });
});

describe("operatorSpec", () => {
  it("describes value arity", () => {
    expect(operatorSpec("=")?.arity).toBe("scalar");
    expect(operatorSpec("in")?.arity).toBe("list");
    expect(operatorSpec("between")?.arity).toBe("pair");
    expect(operatorSpec("is_null")?.arity).toBe("none");
  });

  it("marks which operators honour Match case", () => {
    expect(operatorSpec("contains")?.supportsMatchCase).toBe(true);
    expect(operatorSpec("matches_regex")?.supportsMatchCase).toBe(false);
    expect(operatorSpec(">")?.supportsMatchCase).toBe(false);
  });

  it("has a spec for every operator in the catalog", () => {
    QUERY_FILTER_OPERATOR_SPECS.forEach((spec) => {
      expect(operatorSpec(spec.operator)).toBe(spec);
    });
  });
});
