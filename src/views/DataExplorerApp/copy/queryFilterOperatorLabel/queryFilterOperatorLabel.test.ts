import { describe, expect, it } from "vitest";

import { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilterOperator/QueryFilterOperator";
import { queryFilterOperatorLabel } from "@/views/DataExplorerApp/copy/queryFilterOperatorLabel/queryFilterOperatorLabel";

describe("queryFilterOperatorLabel", () => {
  it("reads comparison operators as magnitudes on a number", () => {
    const labels = ([">", ">=", "<", "<="] as const).map((operator) => {
      return queryFilterOperatorLabel({ operator, dataType: "bigint" });
    });
    expect(labels).toEqual([
      "is greater than",
      "is at least",
      "is less than",
      "is at most",
    ]);
  });

  it("reads the same operators as points in time on a date", () => {
    const labels = ([">", ">=", "<", "<="] as const).map((operator) => {
      return queryFilterOperatorLabel({ operator, dataType: "date" });
    });
    expect(labels).toEqual([
      "is after",
      "is on or after",
      "is before",
      "is on or before",
    ]);
  });

  it("distinguishes equality on a date from equality on a number", () => {
    expect(
      queryFilterOperatorLabel({ operator: "=", dataType: "timestamp" }),
    ).toBe("is on");
    expect(
      queryFilterOperatorLabel({ operator: "=", dataType: "bigint" }),
    ).toBe("is");
    expect(
      queryFilterOperatorLabel({ operator: "!=", dataType: "timestamp" }),
    ).toBe("is not on");
    expect(
      queryFilterOperatorLabel({ operator: "!=", dataType: "bigint" }),
    ).toBe("is not");
  });

  it("treats an unknown column type as non-temporal", () => {
    expect(
      queryFilterOperatorLabel({ operator: ">=", dataType: undefined }),
    ).toBe("is at least");
  });

  it("marks the legacy pattern operators as legacy", () => {
    expect(
      queryFilterOperatorLabel({ operator: "like", dataType: "varchar" }),
    ).toBe("matches pattern (legacy)");
    expect(
      queryFilterOperatorLabel({ operator: "not_like", dataType: "varchar" }),
    ).toBe("does not match pattern (legacy)");
  });

  it("labels text operators as phrases rather than symbols", () => {
    expect(
      queryFilterOperatorLabel({
        operator: "not_contains",
        dataType: "varchar",
      }),
    ).toBe("does not contain");
    expect(
      queryFilterOperatorLabel({ operator: "in", dataType: "varchar" }),
    ).toBe("is any of");
    expect(
      queryFilterOperatorLabel({ operator: "not_in", dataType: "varchar" }),
    ).toBe("is none of");
  });

  it("labels every operator in the catalog", () => {
    const labels = QueryFilterOperator.SPECS.map((spec) => {
      return queryFilterOperatorLabel({
        operator: spec.operator,
        dataType: "varchar",
      });
    });
    labels.forEach((label, idx) => {
      expect(label, QueryFilterOperator.SPECS[idx]?.operator).not.toBe("");
    });
    // Each operator reads differently, so a copy-paste slip in the table shows
    // up as two operators sharing one label.
    expect(new Set(labels).size).toBe(labels.length);
  });
});
