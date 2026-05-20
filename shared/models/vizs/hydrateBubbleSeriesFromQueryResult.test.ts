import { hydrateBubbleSeriesFromQueryResult } from "$/models/vizs/hydrateBubbleSeriesFromQueryResult.ts";
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

describe("hydrateBubbleSeriesFromQueryResult", () => {
  it("returns unchanged config when columns are empty", () => {
    const cfg = { vizType: "bubble" as const, series: [] };
    const out = hydrateBubbleSeriesFromQueryResult(cfg, []);
    expect(out).toBe(cfg);
  });

  it("prunes a series whose xKey is missing and re-seeds from two numerics", () => {
    // xKey "gone" missing; "y" and "s" remain => seeds { xKey:"y", key:"s", sizeKey:"s" }
    const out = hydrateBubbleSeriesFromQueryResult(
      {
        vizType: "bubble" as const,
        series: [{ xKey: "gone", key: "y", sizeKey: "s" }],
      },
      cols([
        { name: "y", dataType: "double" },
        { name: "s", dataType: "double" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({ xKey: "y", key: "s", sizeKey: "s" });
  });

  it("prunes a series whose key (Y) is missing and re-seeds from two numerics", () => {
    const out = hydrateBubbleSeriesFromQueryResult(
      {
        vizType: "bubble" as const,
        series: [{ xKey: "x", key: "gone", sizeKey: "s" }],
      },
      cols([
        { name: "x", dataType: "double" },
        { name: "s", dataType: "double" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({ xKey: "x", key: "s", sizeKey: "s" });
  });

  it("prunes a series whose sizeKey is missing and re-seeds from two numerics", () => {
    const out = hydrateBubbleSeriesFromQueryResult(
      {
        vizType: "bubble" as const,
        series: [{ xKey: "x", key: "y", sizeKey: "gone" }],
      },
      cols([
        { name: "x", dataType: "double" },
        { name: "y", dataType: "double" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({ xKey: "x", key: "y", sizeKey: "y" });
  });

  it("prunes a series and leaves empty when no numeric columns remain", () => {
    const out = hydrateBubbleSeriesFromQueryResult(
      {
        vizType: "bubble" as const,
        series: [{ xKey: "gone", key: "also_gone", sizeKey: "gone_too" }],
      },
      cols([{ name: "label", dataType: "varchar" }]),
    );
    expect(out.series).toHaveLength(0);
  });

  it("keeps a series whose all three keys exist in columns", () => {
    const out = hydrateBubbleSeriesFromQueryResult(
      {
        vizType: "bubble" as const,
        series: [{ xKey: "x", key: "y", sizeKey: "s" }],
      },
      cols([
        { name: "x", dataType: "double" },
        { name: "y", dataType: "double" },
        { name: "s", dataType: "double" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({ xKey: "x", key: "y", sizeKey: "s" });
  });

  it("seeds from first three numeric columns when series is empty", () => {
    const out = hydrateBubbleSeriesFromQueryResult(
      { vizType: "bubble" as const, series: [] },
      cols([
        { name: "a", dataType: "double" },
        { name: "b", dataType: "bigint" },
        { name: "c", dataType: "double" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({ xKey: "a", key: "b", sizeKey: "c" });
  });

  it("seeds from two numerics with sizeKey=key when only two numeric columns", () => {
    const out = hydrateBubbleSeriesFromQueryResult(
      { vizType: "bubble" as const, series: [] },
      cols([
        { name: "a", dataType: "double" },
        { name: "b", dataType: "double" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({ xKey: "a", key: "b", sizeKey: "b" });
  });

  it("seeds all three from one numeric column when only one exists", () => {
    const out = hydrateBubbleSeriesFromQueryResult(
      { vizType: "bubble" as const, series: [] },
      cols([
        { name: "val", dataType: "double" },
        { name: "label", dataType: "varchar" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({ xKey: "val", key: "val", sizeKey: "val" });
  });

  it("leaves series empty when no numeric columns exist", () => {
    const out = hydrateBubbleSeriesFromQueryResult(
      { vizType: "bubble" as const, series: [] },
      cols([{ name: "label", dataType: "varchar" }]),
    );
    expect(out.series).toHaveLength(0);
  });
});
