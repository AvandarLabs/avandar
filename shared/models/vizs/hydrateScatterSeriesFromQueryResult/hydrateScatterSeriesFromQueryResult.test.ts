import { describe, expect, it } from "vitest";
import { hydrateScatterSeriesFromQueryResult } from "$/models/vizs/hydrateScatterSeriesFromQueryResult/hydrateScatterSeriesFromQueryResult.ts";
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

describe("hydrateScatterSeriesFromQueryResult", () => {
  it("returns unchanged config when columns are empty", () => {
    const cfg = { vizType: "scatter" as const, series: [] };
    const out = hydrateScatterSeriesFromQueryResult(cfg, []);
    expect(out).toBe(cfg);
  });

  it("prunes a series whose xKey is missing and re-seeds from one numeric", () => {
    // xKey "gone" missing; "y" is numeric =>
    // seeding produces { xKey: "y", key: "y" }
    const out = hydrateScatterSeriesFromQueryResult(
      {
        vizType: "scatter" as const,
        series: [{ xKey: "gone", key: "y" }],
      },
      cols([{ name: "y", dataType: "double" }]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({ xKey: "y", key: "y" });
  });

  it("prunes a series whose key (Y) is missing and re-seeds from one numeric", () => {
    // key "gone" missing; "x" is numeric =>
    // seeding produces { xKey: "x", key: "x" }
    const out = hydrateScatterSeriesFromQueryResult(
      {
        vizType: "scatter" as const,
        series: [{ xKey: "x", key: "gone" }],
      },
      cols([{ name: "x", dataType: "double" }]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({ xKey: "x", key: "x" });
  });

  it("prunes a series and leaves empty when no numeric columns remain", () => {
    const out = hydrateScatterSeriesFromQueryResult(
      {
        vizType: "scatter" as const,
        series: [{ xKey: "gone", key: "also_gone" }],
      },
      cols([{ name: "label", dataType: "varchar" }]),
    );
    expect(out.series).toHaveLength(0);
  });

  it("keeps a series whose both xKey and key exist in columns", () => {
    const out = hydrateScatterSeriesFromQueryResult(
      {
        vizType: "scatter" as const,
        series: [{ xKey: "x", key: "y" }],
      },
      cols([
        { name: "x", dataType: "double" },
        { name: "y", dataType: "double" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({ xKey: "x", key: "y" });
  });

  it("seeds from first two numeric columns when series is empty", () => {
    const out = hydrateScatterSeriesFromQueryResult(
      { vizType: "scatter" as const, series: [] },
      cols([
        { name: "a", dataType: "double" },
        { name: "b", dataType: "bigint" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({ xKey: "a", key: "b" });
  });

  it("seeds xKey=key when only one numeric column exists", () => {
    const out = hydrateScatterSeriesFromQueryResult(
      { vizType: "scatter" as const, series: [] },
      cols([
        { name: "val", dataType: "double" },
        { name: "label", dataType: "varchar" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({ xKey: "val", key: "val" });
  });

  it("leaves series empty when no numeric columns exist", () => {
    const out = hydrateScatterSeriesFromQueryResult(
      { vizType: "scatter" as const, series: [] },
      cols([{ name: "label", dataType: "varchar" }]),
    );
    expect(out.series).toHaveLength(0);
  });

  it("does not seed when existing valid series are present", () => {
    const out = hydrateScatterSeriesFromQueryResult(
      {
        vizType: "scatter" as const,
        series: [{ xKey: "a", key: "b" }],
      },
      cols([
        { name: "a", dataType: "double" },
        { name: "b", dataType: "double" },
        { name: "c", dataType: "double" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({ xKey: "a", key: "b" });
  });
});
