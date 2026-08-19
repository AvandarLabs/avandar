import { describe, expect, it } from "vitest";
import { resolveOutputMode } from "./resolveOutputMode";
import type { ExtractedTable, PdfRegionShape } from "../pdfSniff.types";

function _table(regionId: string, cells: readonly string[][]): ExtractedTable {
  return {
    regionId,
    cells,
    headerRows: 1,
    flags: [],
    extractedBy: "rules",
    rowProvenance: cells.slice(1).map(() => {
      return { page: 0, bbox: [0, 0, 1, 1] as const };
    }),
  };
}

const TABLE_CELLS = [
  ["district", "cases"],
  ["Khartoum", "12"],
];
const CHART_CELLS = [
  ["label", "value"],
  ["Week 1", "12"],
];

function _resolve(options: {
  tables: readonly ExtractedTable[];
  shapes: Readonly<Record<string, PdfRegionShape>>;
  chosenMode?: "natural" | "observations";
}): ReturnType<typeof resolveOutputMode> {
  return resolveOutputMode({
    tables: options.tables,
    shapesByRegionId: options.shapes,
    chosenMode: options.chosenMode,
  });
}

describe("resolveOutputMode", () => {
  it("keeps the printed columns of a single detected table", () => {
    const resolution = _resolve({
      tables: [_table("r1", TABLE_CELLS)],
      shapes: { r1: "grid_table" },
    });

    expect(resolution.mode).toBe("natural");
    expect(resolution.isKeepAvailable).toBe(true);
    expect(resolution.keepColumns).toEqual(["district", "cases"]);
  });

  it("keeps the printed columns of one table spanning several pages", () => {
    const resolution = _resolve({
      tables: [
        _table("r1", TABLE_CELLS),
        // The continuation repeats its header with different capitalisation,
        // which is what `getPrintedColumnKey` is there to see past.
        _table("r2", [
          ["District", "Cases"],
          ["Gezira", "8"],
        ]),
      ],
      shapes: { r1: "grid_table", r2: "grid_table" },
    });

    expect(resolution.mode).toBe("natural");
    expect(resolution.isKeepAvailable).toBe(true);
  });

  it("normalises a chart, which has no printed table to keep", () => {
    const resolution = _resolve({
      tables: [_table("r1", CHART_CELLS)],
      shapes: { r1: "labelled_graphic" },
    });

    expect(resolution.mode).toBe("observations");
    // The choice is still the user's: a chart's rows do share one header, so
    // keeping them is possible even though it is not the default.
    expect(resolution.isKeepAvailable).toBe(true);
    expect(resolution.keepBlockedBy).toBeUndefined();
  });

  it("normalises prose and repeating blocks", () => {
    for (const shape of ["prose_measures", "repeating_blocks"] as const) {
      expect(
        _resolve({
          tables: [_table("r1", CHART_CELLS)],
          shapes: { r1: shape },
        }).mode,
      ).toBe("observations");
    }
  });

  it("forces normalising when the regions print different columns", () => {
    const resolution = _resolve({
      tables: [_table("r1", TABLE_CELLS), _table("r2", CHART_CELLS)],
      shapes: { r1: "grid_table", r2: "labelled_graphic" },
    });

    expect(resolution.mode).toBe("observations");
    expect(resolution.isKeepAvailable).toBe(false);
    expect(resolution.keepBlockedBy).toBe("mixed_columns");
  });

  it("reports that nothing produced rows", () => {
    const resolution = _resolve({
      tables: [_table("r1", [["district", "cases"]])],
      shapes: { r1: "grid_table" },
    });

    expect(resolution.keepBlockedBy).toBe("no_rows");
    expect(resolution.isKeepAvailable).toBe(false);
    expect(resolution.populatedShapes).toEqual([]);
  });

  it("lets an explicit choice beat the detected default", () => {
    expect(
      _resolve({
        tables: [_table("r1", CHART_CELLS)],
        shapes: { r1: "labelled_graphic" },
        chosenMode: "natural",
      }).mode,
    ).toBe("natural");
    expect(
      _resolve({
        tables: [_table("r1", TABLE_CELLS)],
        shapes: { r1: "grid_table" },
        chosenMode: "observations",
      }).mode,
    ).toBe("observations");
  });

  it("ignores a choice the combiner would override anyway", () => {
    const resolution = _resolve({
      tables: [_table("r1", TABLE_CELLS), _table("r2", CHART_CELLS)],
      shapes: { r1: "grid_table", r2: "labelled_graphic" },
      chosenMode: "natural",
    });

    expect(resolution.mode).toBe("observations");
  });

  it("reports the distinct shapes that produced rows", () => {
    const resolution = _resolve({
      tables: [
        _table("r1", CHART_CELLS),
        _table("r2", CHART_CELLS),
        _table("r3", [["label", "value"]]),
      ],
      shapes: {
        r1: "labelled_graphic",
        r2: "labelled_graphic",
        r3: "grid_table",
      },
    });

    expect(resolution.populatedShapes).toEqual(["labelled_graphic"]);
  });
});
