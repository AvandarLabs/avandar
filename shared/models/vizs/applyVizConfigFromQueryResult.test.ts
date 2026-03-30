import { describe, expect, it } from "vitest";
import {
  applyVizConfigFromQueryResult,
  isVizConfigEqualForQueryResultSync,
} from "$/models/vizs/applyVizConfigFromQueryResult.ts";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";
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
          yAxisKey: undefined,
        },
      ),
    ).toBe(false);
  });

  it("compares XY keys for bar configs", () => {
    const a = {
      vizType: "bar" as const,
      xAxisKey: "a",
      yAxisKey: "b",
    };
    const b = {
      vizType: "bar" as const,
      xAxisKey: "a",
      yAxisKey: "b",
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
        yAxisKey: "n",
      },
      rawSQL: undefined,
      query: {
        ...emptyQuery,
        queryColumns: [],
      },
      columns: cols([{ name: "n", dataType: "double" }]),
    });
    expect((out as { xAxisKey?: string }).xAxisKey).toBeUndefined();
    expect((out as { yAxisKey?: string }).yAxisKey).toBe("n");
  });

  it("hydrates from result when raw SQL is set", () => {
    const out = applyVizConfigFromQueryResult({
      vizConfig: {
        vizType: "bar",
        xAxisKey: undefined,
        yAxisKey: undefined,
      },
      rawSQL: "SELECT * FROM t",
      query: emptyQuery,
      columns: cols([
        { name: "month", dataType: "timestamp" },
        { name: "total", dataType: "double" },
      ]),
    });
    expect((out as { xAxisKey?: string }).xAxisKey).toBe("month");
    expect((out as { yAxisKey?: string }).yAxisKey).toBe("total");
  });

  it("does not change axes when both are valid in result (2B)", () => {
    const out = applyVizConfigFromQueryResult({
      vizConfig: {
        vizType: "bar",
        xAxisKey: "month",
        yAxisKey: "total",
      },
      rawSQL: "SELECT * FROM t",
      query: emptyQuery,
      columns: cols([
        { name: "month", dataType: "timestamp" },
        { name: "total", dataType: "double" },
      ]),
    });
    expect((out as { xAxisKey?: string }).xAxisKey).toBe("month");
    expect((out as { yAxisKey?: string }).yAxisKey).toBe("total");
  });
});
