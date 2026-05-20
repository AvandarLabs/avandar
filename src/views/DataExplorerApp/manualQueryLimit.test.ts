import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { describe, expect, it } from "vitest";
import {
  applyDefaultManualQueryLimit,
  DEFAULT_MANUAL_QUERY_LIMIT,
  getManualQueryLimitValue,
  shouldDefaultManualQueryLimit,
} from "@/views/DataExplorerApp/manualQueryLimit";

describe("manualQueryLimit", () => {
  it("defaults the manual-query limit for an empty query", () => {
    const query = StructuredQuery.makeEmpty();

    expect(shouldDefaultManualQueryLimit(query)).toBe(true);
    expect(getManualQueryLimitValue(query)).toBe(DEFAULT_MANUAL_QUERY_LIMIT);
    expect(applyDefaultManualQueryLimit(query).limit).toBe(
      DEFAULT_MANUAL_QUERY_LIMIT,
    );
  });

  it("does not inject the default limit into a non-empty query", () => {
    const query = {
      ...StructuredQuery.makeEmpty(),
      dataSource: {
        __type: "Dataset",
        id: "dataset_123",
        name: "Dataset",
      },
    };

    expect(shouldDefaultManualQueryLimit(query)).toBe(false);
    expect(getManualQueryLimitValue(query)).toBeUndefined();
    expect(applyDefaultManualQueryLimit(query).limit).toBeUndefined();
  });

  it("preserves an explicit limit", () => {
    const query = {
      ...StructuredQuery.makeEmpty(),
      limit: 20,
    };

    expect(shouldDefaultManualQueryLimit(query)).toBe(false);
    expect(getManualQueryLimitValue(query)).toBe(20);
    expect(applyDefaultManualQueryLimit(query).limit).toBe(20);
  });
});
