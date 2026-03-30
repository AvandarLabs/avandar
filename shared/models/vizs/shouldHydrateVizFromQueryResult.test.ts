import { describe, expect, it } from "vitest";
import { StructuredQueryUtils } from "$/models/queries/StructuredQuery/StructuredQueryUtils/StructuredQueryUtils.ts";
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

function _makeQueryWithColumns(
  columns: QueryColumn[],
): PartialStructuredQuery {
  return {
    ...StructuredQueryUtils.makeEmpty(),
    queryColumns: columns,
  } as unknown as PartialStructuredQuery;
}

describe("shouldHydrateVizFromQueryResult", () => {
  const emptyQuery = StructuredQueryUtils.makeEmpty();

  const barEmpty: VizConfig = {
    vizType: "bar",
    xAxisKey: undefined,
    yAxisKey: undefined,
    withLegend: true,
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
          withLegend: true,
        },
        resultColumnNames: new Set(["month", "total"]),
      }),
    ).toBe(false);
  });

  it("returns false when rawSQL is only whitespace and structured matches", () => {
    expect(
      shouldHydrateVizFromQueryResult({
        rawSQL: "   \n  ",
        query: _makeQueryWithColumns([
          mockColumn("month"),
          mockColumn("total_cases"),
        ]),
        vizConfig: {
          vizType: "bar",
          xAxisKey: "month",
          yAxisKey: "total_cases",
          withLegend: true,
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
    expect(
      shouldHydrateVizFromQueryResult({
        rawSQL: undefined,
        query: _makeQueryWithColumns([mockColumn("month")]),
        vizConfig: {
          vizType: "bar",
          xAxisKey: "old_x",
          yAxisKey: "y",
          withLegend: true,
        },
        resultColumnNames: new Set(["month", "y"]),
      }),
    ).toBe(true);
  });

  it("returns true when structured names do not overlap result", () => {
    expect(
      shouldHydrateVizFromQueryResult({
        rawSQL: undefined,
        query: _makeQueryWithColumns([mockColumn("structured_only")]),
        vizConfig: barEmpty,
        resultColumnNames: new Set(["from_sql_alias", "metric"]),
      }),
    ).toBe(true);
  });

  it("returns false when structured overlaps result and axes are valid", () => {
    expect(
      shouldHydrateVizFromQueryResult({
        rawSQL: undefined,
        query: _makeQueryWithColumns([
          mockColumn("month"),
          mockColumn("total_cases"),
        ]),
        vizConfig: {
          vizType: "line",
          xAxisKey: "month",
          yAxisKey: "total_cases",
          withLegend: true,
          curveType: "monotone",
        },
        resultColumnNames: new Set(["month", "total_cases"]),
      }),
    ).toBe(false);
  });
});
