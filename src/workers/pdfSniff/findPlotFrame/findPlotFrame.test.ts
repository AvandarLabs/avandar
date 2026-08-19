import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { clipToRegion } from "../clipToRegion/clipToRegion";
import { extractPageGeometry } from "../extractPageGeometry/extractPageGeometry";
import { loadPdfDocument } from "../loadPdfDocument/loadPdfDocument";
import { findPlotFrame } from "./findPlotFrame";
import type {
  BBox,
  PageGeometry,
  RegionGeometry,
  RuleSegment,
} from "../pdfSniff.types";

const OCHA =
  "public/test-data/pdf/gate/ocha-sudan-cholera-update-2025-07-03.pdf";
const OCHA_TREND: BBox = [30, 55, 570, 215];
const OCHA_BARS: BBox = [300, 300, 570, 440];
const OCHA_MAP: BBox = [305, 450, 570, 615];
const OCHA_TILES: BBox = [330, 272, 580, 325];

function h(position: number, span: readonly [number, number]): RuleSegment {
  return { orientation: "horizontal", position, span };
}

function v(position: number, span: readonly [number, number]): RuleSegment {
  return { orientation: "vertical", position, span };
}

function region(
  rules: readonly RuleSegment[],
  bbox: BBox = [30, 55, 570, 215],
): RegionGeometry {
  return { pageIndex: 0, bbox, textItems: [], rules, marks: [] };
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

describe("findPlotFrame", () => {
  it("returns undefined when the region has no rules", () => {
    expect(findPlotFrame(region([]))).toBeUndefined();
  });

  it("returns undefined for a top border that meets two sides", () => {
    // A map panel's frame, not a plot: there is no x-axis along the bottom.
    expect(
      findPlotFrame(
        region(
          [h(590, [318.7, 519.8]), v(318.7, [442, 590]), v(519.8, [442, 590])],
          [305, 450, 570, 615],
        ),
      ),
    ).toBeUndefined();
  });

  it("returns undefined when long rules do not meet at a corner", () => {
    // Horizontal bar rectangles plus a page-edge rule that never touches them.
    expect(
      findPlotFrame(
        region(
          [
            h(436.5, [357.5, 503.5]),
            h(419.9, [357.5, 503.5]),
            v(357.5, [419.9, 436.5]),
            v(503.5, [419.9, 436.5]),
            v(559.3, [282.6, 464.9]),
          ],
          [300, 300, 570, 440],
        ),
      ),
    ).toBeUndefined();
  });

  it("reads a rectangle from long rules that meet at the corners", () => {
    const frame = findPlotFrame(
      region([
        h(187.8, [36, 559.3]),
        h(61.1, [36, 559.3]),
        v(36, [61.1, 187.8]),
        v(559.3, [61.1, 187.8]),
      ]),
    );

    expect(frame).toEqual({
      left: 36,
      right: 559.3,
      top: 187.8,
      bottom: 61.1,
      gridlines: [61.1, 187.8],
    });
  });

  it("shrinks to an inner x-axis when one sits inside the outer box", () => {
    const frame = findPlotFrame(
      region([
        h(187.8, [36, 559.3]),
        h(93.5, [72, 547.9]),
        h(61.1, [36, 559.3]),
        v(36, [61.1, 187.8]),
        v(559.3, [61.1, 187.8]),
      ]),
    );

    expect(frame?.left).toBeCloseTo(72, 5);
    expect(frame?.right).toBeCloseTo(547.9, 5);
    expect(frame?.top).toBeCloseTo(187.8, 5);
    expect(frame?.bottom).toBeCloseTo(93.5, 5);
    expect(frame?.gridlines).toEqual([93.5, 187.8]);
  });

  it("ignores duplicate strokes of the same rule", () => {
    const frame = findPlotFrame(
      region([
        h(187.8, [36, 559.3]),
        h(187.8, [36, 559.3]),
        h(61.1, [36, 559.3]),
        h(61.1, [36, 559.3]),
        v(36, [61.1, 187.8]),
        v(36, [61.1, 187.8]),
        v(559.3, [61.1, 187.8]),
        v(559.3, [61.1, 187.8]),
      ]),
    );

    expect(frame?.left).toBe(36);
    expect(frame?.right).toBe(559.3);
    expect(frame?.gridlines).toEqual([61.1, 187.8]);
  });

  it("finds the inner plot on the OCHA weekly trend chart", async () => {
    const clipped = clipToRegion({
      page: await pageOf(OCHA, 1),
      bbox: OCHA_TREND,
    });
    const frame = findPlotFrame(clipped);

    expect(frame).toBeDefined();
    expect(frame!.left).toBeCloseTo(72, 0);
    expect(frame!.right).toBeCloseTo(548, 0);
    expect(frame!.top).toBeCloseTo(188, 0);
    expect(frame!.bottom).toBeCloseTo(94, 0);
  });

  it("does not invent a plot frame on the OCHA funding bars", async () => {
    const clipped = clipToRegion({
      page: await pageOf(OCHA, 3),
      bbox: OCHA_BARS,
    });

    expect(findPlotFrame(clipped)).toBeUndefined();
  });

  it("does not invent a plot frame on the OCHA choropleth", async () => {
    const clipped = clipToRegion({
      page: await pageOf(OCHA, 1),
      bbox: OCHA_MAP,
    });

    expect(findPlotFrame(clipped)).toBeUndefined();
  });

  it("does not invent a plot frame on the OCHA KPI tiles", async () => {
    const clipped = clipToRegion({
      page: await pageOf(OCHA, 1),
      bbox: OCHA_TILES,
    });

    expect(findPlotFrame(clipped)).toBeUndefined();
  });
});
