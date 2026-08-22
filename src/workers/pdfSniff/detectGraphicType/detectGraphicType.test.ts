import type { BBox, PageGeometry, RegionGeometry } from "../pdfSniff.types";

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { clipToRegion } from "../clipToRegion/clipToRegion";
import { extractPageGeometry } from "../extractPageGeometry/extractPageGeometry";
import { loadPdfDocument } from "../loadPdfDocument/loadPdfDocument";
import { detectGraphicType } from "./detectGraphicType";

const OCHA =
  "public/test-data/pdf/gate/ocha-sudan-cholera-update-2025-07-03.pdf";
const OCHA_TREND: BBox = [30, 55, 570, 215];
const OCHA_BARS: BBox = [300, 300, 570, 440];
const OCHA_MAP: BBox = [305, 450, 570, 615];
const OCHA_TILES: BBox = [330, 272, 580, 325];

const EMPTY: RegionGeometry = {
  pageIndex: 0,
  bbox: [0, 0, 100, 100],
  textItems: [],
  rules: [],
  marks: [],
};

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

async function detect(pageNumber: number, bbox: BBox) {
  return detectGraphicType(
    clipToRegion({ page: await pageOf(OCHA, pageNumber), bbox }),
  );
}

describe("detectGraphicType", () => {
  it("says a region with nothing drawn in it is unknown", () => {
    expect(detectGraphicType(EMPTY)).toEqual({
      kind: "unknown",
      evidence: [
        "0 filled shapes, forming neither a plot's axes nor a family of bars.",
      ],
    });
  });

  it("calls the OCHA funding chart a bar chart, and says why", async () => {
    expect(await detect(3, OCHA_BARS)).toEqual({
      kind: "bar_chart",
      evidence: [
        "5 bars growing from a shared left edge, in 3 different lengths.",
      ],
    });
  });

  it("calls the OCHA weekly trend an area chart, and says why", async () => {
    const detection = await detect(1, OCHA_TREND);
    expect(detection.kind).toBe("line_area_chart");
    expect(detection.evidence[0]).toMatch(
      /^Axes meeting at a corner, \d+ gridlines across the plot, and a series path of \d+ points across it\.$/u,
    );
  });

  it("does not claim to recognise the choropleth", async () => {
    // Honest rather than clever. The map's states do not reach us as
    // polygons at all, so there is nothing here to call a map, and guessing
    // one from the region's text would be the classifier's job anyway.
    expect((await detect(1, OCHA_MAP)).kind).toBe("unknown");
  });

  it("does not claim to recognise the KPI tiles", async () => {
    expect((await detect(1, OCHA_TILES)).kind).toBe("unknown");
  });
});
