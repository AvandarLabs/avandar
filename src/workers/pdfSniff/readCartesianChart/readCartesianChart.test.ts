import type { BBox, PageGeometry } from "../pdfSniff.types";

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { clipToRegion } from "../clipToRegion/clipToRegion";
import { extractPageGeometry } from "../extractPageGeometry/extractPageGeometry";
import { loadPdfDocument } from "../loadPdfDocument/loadPdfDocument";
import { readCartesianChart } from "./readCartesianChart";

const OCHA =
  "public/test-data/pdf/gate/ocha-sudan-cholera-update-2025-07-03.pdf";
const OCHA_TREND: BBox = [30, 55, 570, 215];
const OCHA_BARS: BBox = [300, 300, 570, 440];
const OCHA_MAP: BBox = [305, 450, 570, 615];

async function pageOf(path: string, pageNumber: number): Promise<PageGeometry> {
  const bytes = await readFile(path);
  const doc = await loadPdfDocument(new Uint8Array(bytes));
  const page = await doc.getPage(pageNumber);
  const geometry = await extractPageGeometry({
    page,
    pageIndex: pageNumber - 1,
  });
  await doc.destroy();
  return geometry;
}

describe("readCartesianChart", () => {
  it("reads 26 weekly values from the OCHA trend area chart", async () => {
    const region = clipToRegion({
      page: await pageOf(OCHA, 1),
      bbox: OCHA_TREND,
    });
    const table = readCartesianChart(region, { regionId: "trend" });

    expect(table).toBeDefined();
    expect(table!.cells[0]).toEqual(["week", "value"]);
    const rows = table!.cells.slice(1);
    expect(rows).toHaveLength(26);
    expect(
      rows.map((row) => {
        return row[0];
      }),
    ).toEqual(
      Array.from({ length: 26 }, (_unused, index) => {
        return String(index + 1);
      }),
    );
    const values = rows.map((row) => {
      return Number(row[1]);
    });
    expect(
      values.every((value) => {
        return Number.isFinite(value) && value >= 0 && value <= 10000;
      }),
    ).toBe(true);
    const peakWeek = values.indexOf(Math.max(...values)) + 1;
    expect(peakWeek).toBe(21);
    expect(Math.max(...values)).toBeGreaterThan(5000);
    expect(table!.chartAxis).toEqual(
      expect.objectContaining({
        min: 0,
        max: 10000,
        scale: "linear",
        tickCount: 6,
      }),
    );
    expect(table!.chartAxis!.maxResidual).toBeLessThan(1);
  });

  it("returns undefined when the region is not a Cartesian chart", async () => {
    const map = clipToRegion({
      page: await pageOf(OCHA, 1),
      bbox: OCHA_MAP,
    });
    const bars = clipToRegion({
      page: await pageOf(OCHA, 3),
      bbox: OCHA_BARS,
    });

    expect(readCartesianChart(map, { regionId: "map" })).toBeUndefined();
    expect(readCartesianChart(bars, { regionId: "bars" })).toBeUndefined();
  });

  it("reads the series from two supplied y-axis points when ticks are missing", async () => {
    const full = clipToRegion({
      page: await pageOf(OCHA, 1),
      bbox: OCHA_TREND,
    });
    const withoutYTicks = {
      ...full,
      textItems: full.textItems.filter((item) => {
        return item.x >= 70;
      }),
    };

    expect(
      readCartesianChart(withoutYTicks, { regionId: "trend" }),
    ).toBeUndefined();

    const table = readCartesianChart(withoutYTicks, {
      regionId: "trend",
      yAxisHints: [
        { position: 91.8, value: 0 },
        { position: 180.5, value: 10000 },
      ],
    });
    const rows = table?.cells.slice(1) ?? [];
    const values = rows.map((row) => {
      return Number(row[1]);
    });

    expect(rows).toHaveLength(26);
    expect(values.indexOf(Math.max(...values)) + 1).toBe(21);
  });
});
