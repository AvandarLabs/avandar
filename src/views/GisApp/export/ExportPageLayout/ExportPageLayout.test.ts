import { describe, expect, it } from "vitest";
import { ExportPageLayout } from "@/views/GisApp/export/ExportPageLayout/ExportPageLayout";

describe("ExportPageLayout.fromLayout", () => {
  it("puts the legend in a 56 mm right column in landscape", () => {
    const page = ExportPageLayout.fromLayout({
      paper: "a4",
      orientation: "landscape",
    });

    expect(page.pageMm).toEqual({ width: 297, height: 210 });
    expect(page.legendMm.width).toBe(56);
    expect(page.legendMm.x).toBeGreaterThan(page.mapFrameMm.x);
    expect(page.legendMm.y).toBe(page.mapFrameMm.y);
  });

  it("puts the legend below the map frame in portrait", () => {
    const page = ExportPageLayout.fromLayout({
      paper: "a4",
      orientation: "portrait",
    });

    expect(page.pageMm).toEqual({ width: 210, height: 297 });
    expect(page.legendMm.y).toBeGreaterThan(page.mapFrameMm.y);
    expect(page.legendMm.x).toBe(page.mapFrameMm.x);
  });

  it("keeps 12 mm margins on every edge", () => {
    const page = ExportPageLayout.fromLayout({
      paper: "letter",
      orientation: "landscape",
    });

    expect(page.mapFrameMm.x).toBe(12);
    expect(page.pageMm.width - (page.legendMm.x + page.legendMm.width)).toBe(
      12,
    );
  });

  it("absorbs the letter width difference into the map frame", () => {
    const a4 = ExportPageLayout.fromLayout({
      paper: "a4",
      orientation: "landscape",
    });
    const letter = ExportPageLayout.fromLayout({
      paper: "letter",
      orientation: "landscape",
    });

    expect(letter.legendMm.width).toBe(a4.legendMm.width);
    expect(letter.mapFrameMm.width).not.toBe(a4.mapFrameMm.width);
  });

  it("sizes the map canvas at 200 dpi", () => {
    const page = ExportPageLayout.fromLayout({
      paper: "a4",
      orientation: "landscape",
    });

    expect(page.mapCanvasPx.width).toBe(
      Math.round((page.mapFrameMm.width / 25.4) * 200),
    );
  });
});
