import type { PlotFrame } from "../findPlotFrame/findPlotFrame";
import type {
  BBox,
  PageGeometry,
  RegionGeometry,
  TextItem,
} from "../pdfSniff.types";

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { clipToRegion } from "../clipToRegion/clipToRegion";
import { extractPageGeometry } from "../extractPageGeometry/extractPageGeometry";
import { findPlotFrame } from "../findPlotFrame/findPlotFrame";
import { loadPdfDocument } from "../loadPdfDocument/loadPdfDocument";
import { partitionTextByFrame } from "./partitionTextByFrame";

const OCHA =
  "public/test-data/pdf/gate/ocha-sudan-cholera-update-2025-07-03.pdf";
const OCHA_TREND: BBox = [30, 55, 570, 215];

const FRAME: PlotFrame = {
  left: 72,
  right: 547.9,
  top: 187.8,
  bottom: 93.5,
  gridlines: [93.5, 187.8],
};

function item(
  text: string,
  x: number,
  y: number,
  width?: number,
  height = 6,
): TextItem {
  return {
    text,
    x,
    y,
    width: width ?? text.length * 5,
    height,
    fontName: "f1",
    unmappedCharRatio: 0,
  };
}

function region(textItems: readonly TextItem[]): RegionGeometry {
  return {
    pageIndex: 0,
    bbox: [30, 55, 570, 215],
    textItems,
    rules: [],
    marks: [],
  };
}

function textsOf(
  partition: ReturnType<typeof partitionTextByFrame>,
  role: keyof ReturnType<typeof partitionTextByFrame>,
): string[] {
  return partition[role].map((entry) => {
    return entry.text;
  });
}

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

describe("partitionTextByFrame", () => {
  it("calls text above the frame the title", () => {
    const partition = partitionTextByFrame(
      region([item("Cholera cases trend", 36, 198.1, 79.5, 10)]),
      FRAME,
    );

    expect(textsOf(partition, "title")).toEqual(["Cholera cases trend"]);
  });

  it("calls numeric text left of the frame a y-tick", () => {
    const partition = partitionTextByFrame(
      region([item("10,000", 42, 180.5, 15.2), item("0", 54.4, 91.8, 2.8)]),
      FRAME,
    );

    expect(textsOf(partition, "yTicks")).toEqual(["10,000", "0"]);
  });

  it("calls numeric text below the frame an x-tick", () => {
    const partition = partitionTextByFrame(
      region([item("1", 70.7, 80.3, 2.8), item("2", 89.7, 80.3, 2.8)]),
      FRAME,
    );

    expect(textsOf(partition, "xTicks")).toEqual(["1", "2"]);
  });

  it("calls non-numeric text below the x-ticks a group label", () => {
    const partition = partitionTextByFrame(
      region([
        item("1", 70.7, 80.3, 2.8),
        item("2", 89.7, 80.3, 2.8),
        item("January", 97.5, 64.9, 25.4, 8),
        item("February", 182, 64.9, 27.8, 8),
      ]),
      FRAME,
    );

    expect(textsOf(partition, "xGroupLabels")).toEqual(["January", "February"]);
  });

  it("calls text inside the frame a data label", () => {
    const partition = partitionTextByFrame(
      region([item("3M", 200, 140, 12)]),
      FRAME,
    );

    expect(textsOf(partition, "dataLabels")).toEqual(["3M"]);
  });

  it("does not treat an axis caption as a data label", () => {
    const partition = partitionTextByFrame(
      region([item("Week", 45.2, 80.3, 11.9)]),
      FRAME,
    );

    expect(textsOf(partition, "dataLabels")).toEqual([]);
    expect(textsOf(partition, "other")).toEqual(["Week"]);
  });

  it("assigns OCHA trend-chart scaffolding to axis roles, not data", async () => {
    const clipped = clipToRegion({
      page: await pageOf(OCHA, 1),
      bbox: OCHA_TREND,
    });
    const frame = findPlotFrame(clipped);
    expect(frame).toBeDefined();
    const partition = partitionTextByFrame(clipped, frame!);

    expect(textsOf(partition, "title")).toEqual(["Cholera cases trend"]);
    expect(textsOf(partition, "yTicks")).toEqual([
      "10,000",
      "8,000",
      "6,000",
      "4,000",
      "2,000",
      "0",
    ]);
    expect(textsOf(partition, "xTicks")).toEqual(
      Array.from({ length: 26 }, (_unused, index) => {
        return String(index + 1);
      }),
    );
    expect(textsOf(partition, "xGroupLabels")).toEqual([
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
    ]);
    expect(textsOf(partition, "dataLabels")).toEqual([]);
  });
});
