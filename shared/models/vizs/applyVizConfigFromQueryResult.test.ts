import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";
import {
  applyVizConfigFromQueryResult,
  isVizConfigEqualForQueryResultSync,
} from "$/models/vizs/applyVizConfigFromQueryResult.ts";
import { describe, expect, it } from "vitest";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";

function cols(
  pairs: ReadonlyArray<{
    name: string;
    dataType: QueryResultColumn["dataType"];
  }>,
): QueryResultColumn[] {
  return pairs.map((p) => {
    return { name: p.name, dataType: p.dataType };
  });
}

describe("isVizConfigEqualForQueryResultSync", () => {
  it("returns true for two table configs", () => {
    expect(
      isVizConfigEqualForQueryResultSync(
        { vizType: "table" },
        { vizType: "table" },
      ),
    ).toBe(true);
  });

  it("returns false when viz types differ", () => {
    expect(
      isVizConfigEqualForQueryResultSync(
        { vizType: "table" },
        {
          vizType: "bar",
          xAxisKey: undefined,
          series: [],
          layout: "group",
          withLegend: true,
        },
      ),
    ).toBe(false);
  });

  it("compares xAxisKey and series for bar configs", () => {
    const a = {
      vizType: "bar" as const,
      xAxisKey: "a",
      series: [{ renderAs: "bar" as const, key: "b" }],
      layout: "group" as const,
      withLegend: true,
    };
    const b = {
      vizType: "bar" as const,
      xAxisKey: "a",
      series: [{ renderAs: "bar" as const, key: "b" }],
      layout: "group" as const,
      withLegend: true,
    };
    expect(isVizConfigEqualForQueryResultSync(a, b)).toBe(true);
  });
});

describe("applyVizConfigFromQueryResult", () => {
  const emptyQuery = StructuredQuery.makeEmpty();

  it("leaves table viz unchanged", () => {
    const out = applyVizConfigFromQueryResult({
      vizConfig: { vizType: "table" },
      rawSQL: "SELECT 1",
      query: emptyQuery,
      columns: cols([{ name: "x", dataType: "double" }]),
    });
    expect(out).toEqual({ vizType: "table" });
  });

  it("clears axis keys not present in the result before hydrating", () => {
    const out = applyVizConfigFromQueryResult({
      vizConfig: {
        vizType: "bar",
        xAxisKey: "gone",
        series: [{ renderAs: "bar", key: "n" }],
        layout: "group",
        withLegend: true,
      },
      rawSQL: undefined,
      query: {
        ...emptyQuery,
        queryColumns: [],
      },
      columns: cols([{ name: "n", dataType: "double" }]),
    });
    expect((out as { xAxisKey?: string }).xAxisKey).toBeUndefined();
    expect((out as { series?: Array<{ key: string }> }).series?.[0]?.key).toBe(
      "n",
    );
  });

  it("hydrates from result when raw SQL is set", () => {
    const out = applyVizConfigFromQueryResult({
      vizConfig: {
        vizType: "bar",
        xAxisKey: undefined,
        series: [],
        layout: "group",
        withLegend: true,
      },
      rawSQL: "SELECT * FROM t",
      query: emptyQuery,
      columns: cols([
        { name: "month", dataType: "timestamp" },
        { name: "total", dataType: "double" },
      ]),
    });
    expect((out as { xAxisKey?: string }).xAxisKey).toBe("month");
    expect((out as { series?: Array<{ key: string }> }).series?.[0]?.key).toBe(
      "total",
    );
  });

  it("does not change axes when both are valid in result (2B)", () => {
    const out = applyVizConfigFromQueryResult({
      vizConfig: {
        vizType: "bar",
        xAxisKey: "month",
        series: [{ renderAs: "bar", key: "total" }],
        layout: "group",
        withLegend: true,
      },
      rawSQL: "SELECT * FROM t",
      query: emptyQuery,
      columns: cols([
        { name: "month", dataType: "timestamp" },
        { name: "total", dataType: "double" },
      ]),
    });
    expect((out as { xAxisKey?: string }).xAxisKey).toBe("month");
    expect((out as { series?: Array<{ key: string }> }).series?.[0]?.key).toBe(
      "total",
    );
  });
});
