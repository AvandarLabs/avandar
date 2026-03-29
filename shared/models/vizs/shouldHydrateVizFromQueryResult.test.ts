import { describe, expect, it } from "vitest";
import { shouldHydrateVizFromQueryResult } from "$/models/vizs/shouldHydrateVizFromQueryResult.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.types.ts";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types.ts";

function mockColumn(name: string): QueryColumn {
  return {
    aggregation: undefined,
    baseColumn: { name, dataType: "varchar" },
  } as QueryColumn;
}

const emptyQuery = {
  queryColumns: [],
  aggregations: {},
} as PartialStructuredQuery;

describe("shouldHydrateVizFromQueryResult", () => {
  const barEmpty: VizConfig = {
    vizType: "bar",
    xAxisKey: undefined,
    yAxisKey: undefined,
  };

  it("returns false for table viz", () => {
    expect(
      shouldHydrateVizFromQueryResult({
        rawSQL: "SELECT 1",
        query: emptyQuery,
        vizConfig: { vizType: "table" },
        resultColumnNames: new Set(["a"]),
      }),
    ).toBe(false);
  });

  it("returns true when rawSQL is non-empty", () => {
    expect(
      shouldHydrateVizFromQueryResult({
        rawSQL: "SELECT month, total FROM t",
        query: emptyQuery,
        vizConfig: barEmpty,
        resultColumnNames: new Set(["month", "total"]),
      }),
    ).toBe(true);
  });

  it("returns false when both axes are valid in result (2B), even with rawSQL", () => {
    expect(
      shouldHydrateVizFromQueryResult({
        rawSQL: "SELECT month, total FROM t",
        query: emptyQuery,
        vizConfig: {
          vizType: "bar",
          xAxisKey: "month",
          yAxisKey: "total",
        },
        resultColumnNames: new Set(["month", "total"]),
      }),
    ).toBe(false);
  });

  it("returns false when rawSQL is only whitespace and structured matches", () => {
    const q = {
      queryColumns: [mockColumn("month"), mockColumn("total_cases")],
      aggregations: {},
    } as PartialStructuredQuery;
    expect(
      shouldHydrateVizFromQueryResult({
        rawSQL: "   \n  ",
        query: q,
        vizConfig: {
          vizType: "bar",
          xAxisKey: "month",
          yAxisKey: "total_cases",
        },
        resultColumnNames: new Set(["month", "total_cases"]),
      }),
    ).toBe(false);
  });

  it("returns true when query has no columns", () => {
    expect(
      shouldHydrateVizFromQueryResult({
        rawSQL: undefined,
        query: emptyQuery,
        vizConfig: barEmpty,
        resultColumnNames: new Set(["x"]),
      }),
    ).toBe(true);
  });

  it("returns true when an axis key is missing from the result", () => {
    const q = {
      queryColumns: [mockColumn("month")],
      aggregations: {},
    } as PartialStructuredQuery;
    expect(
      shouldHydrateVizFromQueryResult({
        rawSQL: undefined,
        query: q,
        vizConfig: {
          vizType: "bar",
          xAxisKey: "old_x",
          yAxisKey: "y",
        },
        resultColumnNames: new Set(["month", "y"]),
      }),
    ).toBe(true);
  });

  it("returns true when structured names do not overlap result", () => {
    const q = {
      queryColumns: [mockColumn("structured_only")],
      aggregations: {},
    } as PartialStructuredQuery;
    expect(
      shouldHydrateVizFromQueryResult({
        rawSQL: undefined,
        query: q,
        vizConfig: barEmpty,
        resultColumnNames: new Set(["from_sql_alias", "metric"]),
      }),
    ).toBe(true);
  });

  it("returns false when structured overlaps result and axes are valid", () => {
    const q = {
      queryColumns: [mockColumn("month"), mockColumn("total_cases")],
      aggregations: {},
    } as PartialStructuredQuery;
    expect(
      shouldHydrateVizFromQueryResult({
        rawSQL: undefined,
        query: q,
        vizConfig: {
          vizType: "line",
          xAxisKey: "month",
          yAxisKey: "total_cases",
        },
        resultColumnNames: new Set(["month", "total_cases"]),
      }),
    ).toBe(false);
  });
});
