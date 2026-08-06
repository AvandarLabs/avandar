import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { describe, expect, it } from "vitest";
import {
  applyDefaultManualQueryLimit,
  DEFAULT_MANUAL_QUERY_LIMIT,
  getManualQueryLimitValue,
  LARGE_DATASET_AUTO_LIMIT,
  LARGE_DATASET_ROW_THRESHOLD,
  largeDatasetAutoLimitFromRowCount,
  shouldAutoLimitLargeDataset,
  shouldDefaultManualQueryLimit,
} from "@/views/DataExplorerApp/manualQueryLimit/manualQueryLimit";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";

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
    } as unknown as PartialStructuredQuery;

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

  it("exports the large-dataset threshold and auto limit", () => {
    expect(LARGE_DATASET_ROW_THRESHOLD).toBe(50_000);
    expect(LARGE_DATASET_AUTO_LIMIT).toBe(DEFAULT_MANUAL_QUERY_LIMIT);
  });

  it("allows auto limit only when no limit, filters, or aggregations are set", () => {
    const emptyQuery = StructuredQuery.makeEmpty();

    expect(shouldAutoLimitLargeDataset(emptyQuery)).toBe(true);

    const withLimit = { ...emptyQuery, limit: 10 };
    expect(shouldAutoLimitLargeDataset(withLimit)).toBe(false);

    const withFilter = {
      ...emptyQuery,
      filters: {
        type: "group" as const,
        combinator: "AND" as const,
        rules: [
          {
            type: "rule" as const,
            columnName: "id",
            operator: "=" as const,
            value: 1,
          },
        ],
      },
    };
    expect(shouldAutoLimitLargeDataset(withFilter)).toBe(false);

    const withAggregation = {
      ...emptyQuery,
      aggregations: { col_1: "count" as const },
    };
    expect(shouldAutoLimitLargeDataset(withAggregation)).toBe(false);
  });

  it("returns the auto limit only when row count exceeds the threshold", () => {
    expect(
      largeDatasetAutoLimitFromRowCount(LARGE_DATASET_ROW_THRESHOLD),
    ).toBeUndefined();
    expect(
      largeDatasetAutoLimitFromRowCount(LARGE_DATASET_ROW_THRESHOLD + 1),
    ).toBe(LARGE_DATASET_AUTO_LIMIT);
  });
});
