import { describe, expect, it } from "vitest";
import { hydrateScatterSeriesFromQueryResult } from "$/models/vizs/hydrateScatterSeriesFromQueryResult/hydrateScatterSeriesFromQueryResult.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

function cols(
  pairs: ReadonlyArray<{
    id?: QueryColumn.Id;
    name: string;
    dataType: QueryResult.BoundColumn["dataType"];
  }>,
): QueryResult.BoundColumn[] {
  return pairs.map((p) => {
    return {
      id: p.id ?? (p.name as QueryColumn.Id),
      name: p.name,
      dataType: p.dataType,
    };
  });
}

describe("hydrateScatterSeriesFromQueryResult", () => {
  it("returns unchanged config when columns are empty", () => {
    const cfg = { vizType: "scatter" as const, series: [] };
    const out = hydrateScatterSeriesFromQueryResult(cfg, []);
    expect(out).toBe(cfg);
  });

  it("retains a series with a missing xKey is missing", () => {
    // xKey "gone" missing; "y" is numeric =>
    // seeding produces { xKey: "y" as QueryColumn.Id, key: "y" as
    // QueryColumn.Id }
    const out = hydrateScatterSeriesFromQueryResult(
      {
        vizType: "scatter" as const,
        series: [
          { xKey: "gone" as QueryColumn.Id, key: "y" as QueryColumn.Id },
        ],
      },
      cols([{ id: "y" as QueryColumn.Id, name: "y", dataType: "double" }]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toEqual({
      xKey: "gone" as QueryColumn.Id,
      key: "y" as QueryColumn.Id,
    });
  });

  it("retains a series with a missing key (Y) is missing", () => {
    // key "gone" missing; "x" is numeric =>
    // seeding produces { xKey: "x" as QueryColumn.Id, key: "x" as
    // QueryColumn.Id }
    const out = hydrateScatterSeriesFromQueryResult(
      {
        vizType: "scatter" as const,
        series: [
          { xKey: "x" as QueryColumn.Id, key: "gone" as QueryColumn.Id },
        ],
      },
      cols([{ id: "x" as QueryColumn.Id, name: "x", dataType: "double" }]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toEqual({
      xKey: "x" as QueryColumn.Id,
      key: "gone" as QueryColumn.Id,
    });
  });

  it("retains owned IDs when no numeric columns remain", () => {
    const out = hydrateScatterSeriesFromQueryResult(
      {
        vizType: "scatter" as const,
        series: [
          {
            xKey: "gone" as QueryColumn.Id,
            key: "also_gone" as QueryColumn.Id,
          },
        ],
      },
      cols([
        { id: "label" as QueryColumn.Id, name: "label", dataType: "varchar" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toEqual({
      xKey: "gone" as QueryColumn.Id,
      key: "also_gone" as QueryColumn.Id,
    });
  });

  it("keeps a series whose both xKey and key exist in columns", () => {
    const out = hydrateScatterSeriesFromQueryResult(
      {
        vizType: "scatter" as const,
        series: [{ xKey: "x" as QueryColumn.Id, key: "y" as QueryColumn.Id }],
      },
      cols([
        { id: "x" as QueryColumn.Id, name: "x", dataType: "double" },
        { id: "y" as QueryColumn.Id, name: "y", dataType: "double" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({
      xKey: "x" as QueryColumn.Id,
      key: "y" as QueryColumn.Id,
    });
  });

  it("seeds from first two numeric columns when series is empty", () => {
    const out = hydrateScatterSeriesFromQueryResult(
      { vizType: "scatter" as const, series: [] },
      cols([
        { id: "a" as QueryColumn.Id, name: "a", dataType: "double" },
        { id: "b" as QueryColumn.Id, name: "b", dataType: "bigint" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({
      xKey: "a" as QueryColumn.Id,
      key: "b" as QueryColumn.Id,
    });
  });

  it("seeds xKey=key when only one numeric column exists", () => {
    const out = hydrateScatterSeriesFromQueryResult(
      { vizType: "scatter" as const, series: [] },
      cols([
        { id: "val" as QueryColumn.Id, name: "val", dataType: "double" },
        { id: "label" as QueryColumn.Id, name: "label", dataType: "varchar" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({
      xKey: "val" as QueryColumn.Id,
      key: "val" as QueryColumn.Id,
    });
  });

  it("leaves series empty when no numeric columns exist", () => {
    const out = hydrateScatterSeriesFromQueryResult(
      { vizType: "scatter" as const, series: [] },
      cols([
        { id: "label" as QueryColumn.Id, name: "label", dataType: "varchar" },
      ]),
    );
    expect(out.series).toHaveLength(0);
  });

  it("does not seed when existing valid series are present", () => {
    const out = hydrateScatterSeriesFromQueryResult(
      {
        vizType: "scatter" as const,
        series: [{ xKey: "a" as QueryColumn.Id, key: "b" as QueryColumn.Id }],
      },
      cols([
        { id: "a" as QueryColumn.Id, name: "a", dataType: "double" },
        { id: "b" as QueryColumn.Id, name: "b", dataType: "double" },
        { id: "c" as QueryColumn.Id, name: "c", dataType: "double" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({
      xKey: "a" as QueryColumn.Id,
      key: "b" as QueryColumn.Id,
    });
  });
});
