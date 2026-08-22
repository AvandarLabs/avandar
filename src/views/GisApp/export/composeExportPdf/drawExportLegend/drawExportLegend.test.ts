import type { ExportLegendEntry } from "@/views/GisApp/export/composeExportPdf/drawExportLegend/drawExportLegend";

import { describe, expect, it } from "vitest";

import { drawExportLegend } from "@/views/GisApp/export/composeExportPdf/drawExportLegend/drawExportLegend";

/** Builds `count` distinct fill-swatch entries, labelled `Entry 0`, etc. */
function _makeEntries(count: number): ExportLegendEntry[] {
  return Array.from({ length: count }, (_, index) => {
    return {
      label: `Entry ${index}`,
      swatch: { type: "fill", color: "#336699" },
    };
  });
}

describe("drawExportLegend", () => {
  it("fits every entry when the block has room for them all", () => {
    const fit = drawExportLegend({
      block: { x: 10, y: 10, width: 56, height: 60 },
      entries: _makeEntries(3),
    });

    expect(fit.fitsOnPage).toBe(true);
    expect(fit.fitsOnPage && fit.rows).toHaveLength(3);
  });

  it("reports it does not fit rather than truncating the entries", () => {
    const fit = drawExportLegend({
      block: { x: 10, y: 10, width: 56, height: 20 },
      entries: _makeEntries(60),
    });

    expect(fit).toEqual({ fitsOnPage: false });
  });

  it("never drops the last entry (the locked disputed row) when it fits", () => {
    const entries = _makeEntries(3);
    const fit = drawExportLegend({
      block: { x: 0, y: 0, width: 56, height: 60 },
      entries,
    });

    expect(fit.fitsOnPage).toBe(true);
    if (fit.fitsOnPage) {
      expect(fit.rows.at(-1)?.entry).toEqual(entries.at(-1));
    }
  });

  it("fills a column top to bottom before starting the next column", () => {
    const entries = _makeEntries(10);
    const fit = drawExportLegend({
      // Room for exactly 5 rows per column, and at least 2 columns wide.
      block: { x: 0, y: 0, width: 100, height: 30 },
      entries,
    });

    expect(fit.fitsOnPage).toBe(true);
    if (fit.fitsOnPage) {
      // The 6th entry (index 5) starts the second column: same y as the
      // first row, a greater x than the first column's entries.
      const firstRow = fit.rows[0]!;
      const sixthRow = fit.rows[5]!;
      expect(sixthRow.yMm).toBe(firstRow.yMm);
      expect(sixthRow.xMm).toBeGreaterThan(firstRow.xMm);
    }
  });

  it("positions rows within the block's origin", () => {
    const fit = drawExportLegend({
      block: { x: 40, y: 25, width: 56, height: 60 },
      entries: _makeEntries(1),
    });

    expect(fit.fitsOnPage).toBe(true);
    if (fit.fitsOnPage) {
      expect(fit.rows[0]!.xMm).toBe(40);
      expect(fit.rows[0]!.yMm).toBe(25);
    }
  });
});
