import { describe, expect, it } from "vitest";
import { hydrateBubbleSeriesFromQueryResult } from "$/models/vizs/hydrateBubbleSeriesFromQueryResult/hydrateBubbleSeriesFromQueryResult.ts";
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

describe("hydrateBubbleSeriesFromQueryResult", () => {
  it("returns unchanged config when columns are empty", () => {
    const cfg = { vizType: "bubble" as const, series: [] };
    const out = hydrateBubbleSeriesFromQueryResult(cfg, []);
    expect(out).toBe(cfg);
  });

  it("retains a series with a missing xKey is missing", () => {
    // xKey "gone" missing; "y" and "s" remain =>
    // seeds { xKey:"y", key:"s", sizeKey:"s" }
    const out = hydrateBubbleSeriesFromQueryResult(
      {
        vizType: "bubble" as const,
        series: [
          {
            xKey: "gone" as QueryColumn.Id,
            key: "y" as QueryColumn.Id,
            sizeKey: "s" as QueryColumn.Id,
          },
        ],
      },
      cols([
        { id: "y" as QueryColumn.Id, name: "y", dataType: "double" },
        { id: "s" as QueryColumn.Id, name: "s", dataType: "double" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toEqual({
      xKey: "gone" as QueryColumn.Id,
      key: "y" as QueryColumn.Id,
      sizeKey: "s" as QueryColumn.Id,
    });
  });

  it("retains a series with a missing key (Y) is missing", () => {
    const out = hydrateBubbleSeriesFromQueryResult(
      {
        vizType: "bubble" as const,
        series: [
          {
            xKey: "x" as QueryColumn.Id,
            key: "gone" as QueryColumn.Id,
            sizeKey: "s" as QueryColumn.Id,
          },
        ],
      },
      cols([
        { id: "x" as QueryColumn.Id, name: "x", dataType: "double" },
        { id: "s" as QueryColumn.Id, name: "s", dataType: "double" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toEqual({
      xKey: "x" as QueryColumn.Id,
      key: "gone" as QueryColumn.Id,
      sizeKey: "s" as QueryColumn.Id,
    });
  });

  it("retains a series with a missing sizeKey is missing", () => {
    const out = hydrateBubbleSeriesFromQueryResult(
      {
        vizType: "bubble" as const,
        series: [
          {
            xKey: "x" as QueryColumn.Id,
            key: "y" as QueryColumn.Id,
            sizeKey: "gone" as QueryColumn.Id,
          },
        ],
      },
      cols([
        { id: "x" as QueryColumn.Id, name: "x", dataType: "double" },
        { id: "y" as QueryColumn.Id, name: "y", dataType: "double" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toEqual({
      xKey: "x" as QueryColumn.Id,
      key: "y" as QueryColumn.Id,
      sizeKey: "gone" as QueryColumn.Id,
    });
  });

  it("retains owned IDs when no numeric columns remain", () => {
    const out = hydrateBubbleSeriesFromQueryResult(
      {
        vizType: "bubble" as const,
        series: [
          {
            xKey: "gone" as QueryColumn.Id,
            key: "also_gone" as QueryColumn.Id,
            sizeKey: "gone_too" as QueryColumn.Id,
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
      sizeKey: "gone_too" as QueryColumn.Id,
    });
  });

  it("keeps a series whose all three keys exist in columns", () => {
    const out = hydrateBubbleSeriesFromQueryResult(
      {
        vizType: "bubble" as const,
        series: [
          {
            xKey: "x" as QueryColumn.Id,
            key: "y" as QueryColumn.Id,
            sizeKey: "s" as QueryColumn.Id,
          },
        ],
      },
      cols([
        { id: "x" as QueryColumn.Id, name: "x", dataType: "double" },
        { id: "y" as QueryColumn.Id, name: "y", dataType: "double" },
        { id: "s" as QueryColumn.Id, name: "s", dataType: "double" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({
      xKey: "x" as QueryColumn.Id,
      key: "y" as QueryColumn.Id,
      sizeKey: "s" as QueryColumn.Id,
    });
  });

  it("seeds from first three numeric columns when series is empty", () => {
    const out = hydrateBubbleSeriesFromQueryResult(
      { vizType: "bubble" as const, series: [] },
      cols([
        { id: "a" as QueryColumn.Id, name: "a", dataType: "double" },
        { id: "b" as QueryColumn.Id, name: "b", dataType: "bigint" },
        { id: "c" as QueryColumn.Id, name: "c", dataType: "double" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({
      xKey: "a" as QueryColumn.Id,
      key: "b" as QueryColumn.Id,
      sizeKey: "c" as QueryColumn.Id,
    });
  });

  it("seeds from two numerics with sizeKey=key when only two numeric columns", () => {
    const out = hydrateBubbleSeriesFromQueryResult(
      { vizType: "bubble" as const, series: [] },
      cols([
        { id: "a" as QueryColumn.Id, name: "a", dataType: "double" },
        { id: "b" as QueryColumn.Id, name: "b", dataType: "double" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({
      xKey: "a" as QueryColumn.Id,
      key: "b" as QueryColumn.Id,
      sizeKey: "b" as QueryColumn.Id,
    });
  });

  it("seeds all three from one numeric column when only one exists", () => {
    const out = hydrateBubbleSeriesFromQueryResult(
      { vizType: "bubble" as const, series: [] },
      cols([
        { id: "val" as QueryColumn.Id, name: "val", dataType: "double" },
        { id: "label" as QueryColumn.Id, name: "label", dataType: "varchar" },
      ]),
    );
    expect(out.series).toHaveLength(1);
    expect(out.series[0]).toMatchObject({
      xKey: "val" as QueryColumn.Id,
      key: "val" as QueryColumn.Id,
      sizeKey: "val" as QueryColumn.Id,
    });
  });

  it("leaves series empty when no numeric columns exist", () => {
    const out = hydrateBubbleSeriesFromQueryResult(
      { vizType: "bubble" as const, series: [] },
      cols([
        { id: "label" as QueryColumn.Id, name: "label", dataType: "varchar" },
      ]),
    );
    expect(out.series).toHaveLength(0);
  });
});
