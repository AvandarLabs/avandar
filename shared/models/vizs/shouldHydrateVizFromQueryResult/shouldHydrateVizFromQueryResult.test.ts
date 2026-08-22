import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types.ts";

import { describe, expect, it } from "vitest";

import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";
import { shouldHydrateVizFromQueryResult } from "$/models/vizs/shouldHydrateVizFromQueryResult/shouldHydrateVizFromQueryResult.ts";

function mockColumn(name: string): QueryColumn.T {
  return {
    aggregation: undefined,
    baseColumn: { name, dataType: "varchar" },
  } as QueryColumn.T;
}

function _makeQueryWithColumns(
  columns: QueryColumn.T[],
): PartialStructuredQuery {
  return {
    ...StructuredQuery.makeEmpty(),
    queryColumns: columns,
  } as unknown as PartialStructuredQuery;
}

describe("shouldHydrateVizFromQueryResult", () => {
  const emptyQuery = StructuredQuery.makeEmpty();

  const barEmpty: VizConfig = {
    vizType: "bar",
    xAxisKey: undefined,
    series: [],
    layout: "group",
    withLegend: true,
  };

  it("returns false for table viz", () => {
    expect(
      shouldHydrateVizFromQueryResult({
        rawSql: "SELECT 1",
        query: emptyQuery,
        vizConfig: { vizType: "table" },
        resultColumnNames: new Set(["a"]),
      }),
    ).toBe(false);
  });

  it("returns true when rawSql is non-empty", () => {
    expect(
      shouldHydrateVizFromQueryResult({
        rawSql: "SELECT month, total FROM t",
        query: emptyQuery,
        vizConfig: barEmpty,
        resultColumnNames: new Set(["month", "total"]),
      }),
    ).toBe(true);
  });

  it("returns false when both axes are valid in result (2B), even with rawSql", () => {
    expect(
      shouldHydrateVizFromQueryResult({
        rawSql: "SELECT month, total FROM t",
        query: emptyQuery,
        vizConfig: {
          vizType: "bar",
          xAxisKey: "month",
          series: [{ renderAs: "bar", key: "total" }],
          layout: "group",
          withLegend: true,
        },
        resultColumnNames: new Set(["month", "total"]),
      }),
    ).toBe(false);
  });

  it("returns false when rawSql is only whitespace and structured matches", () => {
    expect(
      shouldHydrateVizFromQueryResult({
        rawSql: "   \n  ",
        query: _makeQueryWithColumns([
          mockColumn("month"),
          mockColumn("total_cases"),
        ]),
        vizConfig: {
          vizType: "bar",
          xAxisKey: "month",
          series: [{ renderAs: "bar", key: "total_cases" }],
          layout: "group",
          withLegend: true,
        },
        resultColumnNames: new Set(["month", "total_cases"]),
      }),
    ).toBe(false);
  });

  it("returns true when query has no columns", () => {
    expect(
      shouldHydrateVizFromQueryResult({
        rawSql: undefined,
        query: emptyQuery,
        vizConfig: barEmpty,
        resultColumnNames: new Set(["x"]),
      }),
    ).toBe(true);
  });

  it("returns true when an axis key is missing from the result", () => {
    expect(
      shouldHydrateVizFromQueryResult({
        rawSql: undefined,
        query: _makeQueryWithColumns([mockColumn("month")]),
        vizConfig: {
          vizType: "bar",
          xAxisKey: "old_x",
          series: [{ renderAs: "bar", key: "y" }],
          layout: "group",
          withLegend: true,
        },
        resultColumnNames: new Set(["month", "y"]),
      }),
    ).toBe(true);
  });

  it("returns true when structured names do not overlap result", () => {
    expect(
      shouldHydrateVizFromQueryResult({
        rawSql: undefined,
        query: _makeQueryWithColumns([mockColumn("structured_only")]),
        vizConfig: barEmpty,
        resultColumnNames: new Set(["from_sql_alias", "metric"]),
      }),
    ).toBe(true);
  });

  it("returns true when bar has xAxisKey but no series (incomplete config)", () => {
    expect(
      shouldHydrateVizFromQueryResult({
        rawSql: 'SELECT "Admin2", SUM("daily_new_cases") AS total_cases FROM t',
        query: _makeQueryWithColumns([mockColumn("Admin2")]),
        vizConfig: {
          vizType: "bar",
          xAxisKey: "Admin2",
          series: [],
          layout: "group",
          withLegend: true,
        },
        resultColumnNames: new Set(["Admin2", "total_cases"]),
      }),
    ).toBe(true);
  });

  it("returns false when structured overlaps result and axes are valid", () => {
    expect(
      shouldHydrateVizFromQueryResult({
        rawSql: undefined,
        query: _makeQueryWithColumns([
          mockColumn("month"),
          mockColumn("total_cases"),
        ]),
        vizConfig: {
          vizType: "line",
          xAxisKey: "month",
          series: [
            { renderAs: "line", key: "total_cases", curveType: "monotone" },
          ],
          withLegend: true,
        },
        resultColumnNames: new Set(["month", "total_cases"]),
      }),
    ).toBe(false);
  });
});
