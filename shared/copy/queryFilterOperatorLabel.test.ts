import { queryFilterOperatorLabel } from "$/copy/queryFilterOperatorLabel.ts";
import { QUERY_FILTER_OPERATOR_SPECS } from "$/models/queries/StructuredQuery/QueryFilterOperator.ts";
import { describe, expect, it } from "vitest";

describe("queryFilterOperatorLabel", () => {
  it("reads naturally for text columns", () => {
    expect(queryFilterOperatorLabel("=", "varchar")).toBe("is");
    expect(queryFilterOperatorLabel("contains", "varchar")).toBe("contains");
    expect(queryFilterOperatorLabel("is_blank", "varchar")).toBe("is blank");
  });

  it("reads naturally for dates", () => {
    expect(queryFilterOperatorLabel("=", "date")).toBe("is on");
    expect(queryFilterOperatorLabel(">", "date")).toBe("is after");
    expect(queryFilterOperatorLabel("<=", "date")).toBe("is on or before");
  });

  it("uses comparison wording for numbers", () => {
    expect(queryFilterOperatorLabel(">", "bigint")).toBe("is greater than");
    expect(queryFilterOperatorLabel("<=", "double")).toBe("is at most");
  });

  it("has a label for every operator, including legacy ones", () => {
    QUERY_FILTER_OPERATOR_SPECS.forEach((spec) => {
      expect(queryFilterOperatorLabel(spec.operator, "varchar")).not.toBe("");
    });
  });
});
