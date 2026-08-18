import { describe, expect, it } from "vitest";
import { extractGridTable } from "./extractGridTable";
import type { RegionGeometry, TextItem } from "../types";

function item(text: string, x: number, y: number): TextItem {
  return {
    text,
    x,
    y,
    width: text.length * 5,
    height: 10,
    fontName: "f1",
    unmappedCharRatio: 0,
  };
}

const TABLE: readonly TextItem[] = [
  item("District", 100, 600),
  item("Cases", 250, 600),
  item("Deaths", 400, 600),
  item("Gao", 100, 580),
  item("1,204", 250, 580),
  item("31", 400, 580),
  item("Mopti", 100, 560),
  item("987", 250, 560),
  item("22", 400, 560),
];

function region(textItems = TABLE): RegionGeometry {
  return { pageIndex: 0, bbox: [80, 550, 500, 620], textItems, rules: [] };
}

describe("extractGridTable", () => {
  it("reads rows and columns from alignment when no grid is supplied", () => {
    const result = extractGridTable(region(), { regionId: "r1" });

    expect(result.cells).toEqual([
      ["District", "Cases", "Deaths"],
      ["Gao", "1204", "31"],
      ["Mopti", "987", "22"],
    ]);
  });

  it("uses a supplied grid in preference to deriving one", () => {
    // A detector reports the grid it showed the user. Re-deriving it here
    // could land on different boundaries than the outline they approved.
    const result = extractGridTable(region(), {
      regionId: "r1",
      gridX: [90, 240, 390],
    });

    expect(result.cells[0]).toEqual(["District", "Cases", "Deaths"]);
  });

  it("normalises cell values", () => {
    const result = extractGridTable(region(), { regionId: "r1" });

    // 1,204 loses its separator; nothing else changes.
    expect(result.cells[1]![1]).toBe("1204");
  });

  it("honours an explicit header row count", () => {
    const result = extractGridTable(region(), {
      regionId: "r1",
      headerRows: 2,
    });

    expect(result.headerRows).toBe(2);
  });

  it("defaults to one header row", () => {
    expect(extractGridTable(region(), { regionId: "r1" }).headerRows).toBe(1);
  });

  it("records provenance per row", () => {
    const result = extractGridTable(region(), { regionId: "r1" });

    // Two data rows after the header.
    expect(result.rowProvenance).toHaveLength(2);
  });

  it("returns an empty table for a region with no aligned text", () => {
    const result = extractGridTable(
      region([item("just one thing", 100, 600)]),
      {
        regionId: "r1",
      },
    );

    expect(result.cells).toEqual([]);
  });
});
