import { describe, expect, it } from "vitest";
import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

function cols(
  pairs: ReadonlyArray<{
    id?: QueryColumn.Id;
    name: string;
    dataType: QueryResult.ColumnWithId["dataType"];
  }>,
): QueryResult.ColumnWithId[] {
  return pairs.map((p) => {
    return {
      id: p.id ?? (p.name as QueryColumn.Id),
      name: p.name,
      dataType: p.dataType,
    };
  });
}

describe("AvaVizConfigs.isEqual", () => {
  it("returns true for two table configs", () => {
    expect(
      AvaVizConfigs.isEqual({ vizType: "table" }, { vizType: "table" }),
    ).toBe(true);
  });

  it("returns false when viz types differ", () => {
    expect(
      AvaVizConfigs.isEqual(
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
      xAxisKey: "a" as QueryColumn.Id,
      series: [{ renderAs: "bar" as const, key: "b" as QueryColumn.Id }],
      layout: "group" as const,
      withLegend: true,
    };
    const b = {
      vizType: "bar" as const,
      xAxisKey: "a" as QueryColumn.Id,
      series: [{ renderAs: "bar" as const, key: "b" as QueryColumn.Id }],
      layout: "group" as const,
      withLegend: true,
    };
    expect(AvaVizConfigs.isEqual(a, b)).toBe(true);
  });
});

describe("AvaVizConfigs.hydrateFromQueryResult", () => {
  it("leaves table viz unchanged", () => {
    const out = AvaVizConfigs.hydrateFromQueryResult(
      { vizType: "table" },
      cols([{ id: "x" as QueryColumn.Id, name: "x", dataType: "double" }]),
    );
    expect(out).toEqual({ vizType: "table" });
  });

  it("preserves missing owned axis IDs without reseeding", () => {
    const out = AvaVizConfigs.hydrateFromQueryResult(
      {
        vizType: "bar",
        xAxisKey: "gone" as QueryColumn.Id,
        series: [{ renderAs: "bar", key: "n" as QueryColumn.Id }],
        layout: "group",
        withLegend: true,
      },
      cols([{ id: "n" as QueryColumn.Id, name: "n", dataType: "double" }]),
    );
    expect((out as { xAxisKey?: string }).xAxisKey).toBe("gone");
    expect((out as { series?: Array<{ key: string }> }).series?.[0]?.key).toBe(
      "n",
    );
  });

  it("fills empty axis and series slots from the result columns", () => {
    const out = AvaVizConfigs.hydrateFromQueryResult(
      {
        vizType: "bar",
        xAxisKey: undefined,
        series: [],
        layout: "group",
        withLegend: true,
      },
      cols([
        { id: "month" as QueryColumn.Id, name: "month", dataType: "timestamp" },
        { id: "total" as QueryColumn.Id, name: "total", dataType: "double" },
      ]),
    );
    expect((out as { xAxisKey?: string }).xAxisKey).toBe("month");
    expect((out as { series?: Array<{ key: string }> }).series?.[0]?.key).toBe(
      "total",
    );
  });

  it("preserves the same-named series across a re-query with new columns", () => {
    // First query: bar chart with "count" series and "region" x-axis.
    const initial = AvaVizConfigs.hydrateFromQueryResult(
      {
        vizType: "bar",
        xAxisKey: undefined,
        series: [],
        layout: "group",
        withLegend: true,
      },
      cols([
        { id: "region" as QueryColumn.Id, name: "region", dataType: "varchar" },
        { id: "count" as QueryColumn.Id, name: "count", dataType: "bigint" },
      ]),
    );
    expect(
      (initial as { series?: Array<{ key: string }> }).series?.[0]?.key,
    ).toBe("count");

    // Second query: same column names plus a new column. The user-set
    // "count" series must survive — the bars should still render.
    const next = AvaVizConfigs.hydrateFromQueryResult(
      initial,
      cols([
        { id: "region" as QueryColumn.Id, name: "region", dataType: "varchar" },
        { id: "count" as QueryColumn.Id, name: "count", dataType: "bigint" },
        { id: "total" as QueryColumn.Id, name: "total", dataType: "double" },
      ]),
    );
    expect((next as { series?: Array<{ key: string }> }).series?.[0]?.key).toBe(
      "count",
    );
  });

  it("does not reinterpret an owned ID as a case-insensitive QueryResult column name", () => {
    const out = AvaVizConfigs.hydrateFromQueryResult(
      {
        vizType: "bar",
        // saved config has "Count" but the new query returned "count"
        xAxisKey: "Region" as QueryColumn.Id,
        series: [{ renderAs: "bar", key: "Count" as QueryColumn.Id }],
        layout: "group",
        withLegend: true,
      },
      cols([
        { id: "region" as QueryColumn.Id, name: "region", dataType: "varchar" },
        { id: "count" as QueryColumn.Id, name: "count", dataType: "bigint" },
      ]),
    );
    expect((out as { xAxisKey?: string }).xAxisKey).toBe("Region");
    expect((out as { series?: Array<{ key: string }> }).series?.[0]?.key).toBe(
      "Count",
    );
  });

  it("retains missing series IDs for explicit repair", () => {
    const out = AvaVizConfigs.hydrateFromQueryResult(
      {
        vizType: "bar",
        xAxisKey: "region" as QueryColumn.Id,
        series: [
          { renderAs: "bar", key: "count" as QueryColumn.Id },
          { renderAs: "bar", key: "removed" as QueryColumn.Id },
        ],
        layout: "group",
        withLegend: true,
      },
      cols([
        { id: "region" as QueryColumn.Id, name: "region", dataType: "varchar" },
        { id: "count" as QueryColumn.Id, name: "count", dataType: "bigint" },
      ]),
    );
    const series = (out as { series: Array<{ key: string }> }).series;
    expect(series.length).toBe(2);
    expect(series[1]!.key).toBe("removed");
    expect(series[0]!.key).toBe("count");
  });

  it("does not change axes when both are valid in result (2B)", () => {
    const out = AvaVizConfigs.hydrateFromQueryResult(
      {
        vizType: "bar",
        xAxisKey: "month" as QueryColumn.Id,
        series: [{ renderAs: "bar", key: "total" as QueryColumn.Id }],
        layout: "group",
        withLegend: true,
      },
      cols([
        { id: "month" as QueryColumn.Id, name: "month", dataType: "timestamp" },
        { id: "total" as QueryColumn.Id, name: "total", dataType: "double" },
      ]),
    );
    expect((out as { xAxisKey?: string }).xAxisKey).toBe("month");
    expect((out as { series?: Array<{ key: string }> }).series?.[0]?.key).toBe(
      "total",
    );
  });
});

it("detects scatter-X and bubble-size changes independently of the Y target", () => {
  const key = "y" as QueryColumn.Id;
  const xKey = "x" as QueryColumn.Id;
  const changed = "changed" as QueryColumn.Id;
  expect(
    AvaVizConfigs.isEqual(
      { vizType: "scatter", series: [{ key, xKey }] },
      { vizType: "scatter", series: [{ key, xKey: changed }] },
    ),
  ).toBe(false);
  expect(
    AvaVizConfigs.isEqual(
      { vizType: "bubble", series: [{ key, xKey, sizeKey: key }] },
      { vizType: "bubble", series: [{ key, xKey, sizeKey: changed }] },
    ),
  ).toBe(false);
});
