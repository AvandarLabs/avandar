import type {
  BBox,
  PageGeometry,
  PathMark,
  RegionGeometry,
} from "../pdfSniff.types";

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { clipToRegion } from "../clipToRegion/clipToRegion";
import { extractPageGeometry } from "../extractPageGeometry/extractPageGeometry";
import { loadPdfDocument } from "../loadPdfDocument/loadPdfDocument";
import { findBarFamily } from "./findBarFamily";

const OCHA =
  "public/test-data/pdf/gate/ocha-sudan-cholera-update-2025-07-03.pdf";
const OCHA_BARS: BBox = [300, 300, 570, 440];
const OCHA_MAP: BBox = [305, 450, 570, 615];

function rect(bbox: BBox, isFilled: boolean = true): PathMark {
  return {
    kind: "closed",
    points: [
      { x: bbox[0], y: bbox[1] },
      { x: bbox[2], y: bbox[1] },
      { x: bbox[2], y: bbox[3] },
      { x: bbox[0], y: bbox[3] },
    ],
    bbox,
    isFilled,
    fill: null,
  };
}

function region(
  marks: readonly PathMark[],
  bbox: BBox = [0, 0, 200, 200],
): RegionGeometry {
  return { pageIndex: 0, bbox, textItems: [], rules: [], marks };
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

describe("findBarFamily", () => {
  it("returns undefined when the region has no marks", () => {
    expect(findBarFamily(region([]))).toBeUndefined();
  });

  it("reads horizontal bars growing from a shared left edge", () => {
    const family = findBarFamily(
      region([
        rect([10, 20, 40, 30]),
        rect([10, 40, 70, 50]),
        rect([10, 60, 100, 70]),
      ]),
    );
    expect(family?.orientation).toBe("bar");
    expect(family?.baseline).toBe(10);
    expect(
      family?.bars.map((bar) => {
        return bar.freeEdge;
      }),
    ).toEqual([40, 70, 100]);
  });

  it("reads columns growing from a shared bottom edge", () => {
    const family = findBarFamily(
      region([
        rect([10, 5, 20, 40]),
        rect([30, 5, 40, 70]),
        rect([50, 5, 60, 25]),
      ]),
    );
    expect(family?.orientation).toBe("column");
    expect(family?.baseline).toBe(5);
    // Ordered along the category axis, which is x for a column chart.
    expect(
      family?.bars.map((bar) => {
        return bar.categoryCenter;
      }),
    ).toEqual([15, 35, 55]);
  });

  it("ignores bars of unequal thickness", () => {
    // A panel and its two inner boxes share a left edge but are not a family.
    expect(
      findBarFamily(
        region([
          rect([10, 20, 40, 30]),
          rect([10, 40, 70, 58]),
          rect([10, 60, 100, 92]),
        ]),
      ),
    ).toBeUndefined();
  });

  it("ignores rectangles that are all the same length", () => {
    // A ruled column of cells encodes nothing in its width.
    expect(
      findBarFamily(
        region([
          rect([10, 20, 60, 30]),
          rect([10, 40, 60, 50]),
          rect([10, 60, 60, 70]),
        ]),
      ),
    ).toBeUndefined();
  });

  it("collapses a rectangle painted more than once onto one row", () => {
    // Fill then stroke of the same three boxes: three bars, not six.
    expect(
      findBarFamily(
        region([
          rect([10, 20, 40, 30]),
          rect([10, 20, 40, 30]),
          rect([10, 40, 70, 50]),
          rect([10, 40, 70, 50]),
          rect([10, 60, 100, 70]),
          rect([10, 60, 100, 70]),
        ]),
      )?.bars,
    ).toHaveLength(3);
  });

  it("ignores unfilled rectangles", () => {
    expect(
      findBarFamily(
        region([
          rect([10, 20, 40, 30], false),
          rect([10, 40, 70, 50], false),
          rect([10, 60, 100, 70], false),
        ]),
      ),
    ).toBeUndefined();
  });

  it("finds the five funding bars on the OCHA chart", async () => {
    const family = findBarFamily(
      clipToRegion({ page: await pageOf(OCHA, 3), bbox: OCHA_BARS }),
    );
    expect(family?.orientation).toBe("bar");
    expect(family?.baseline).toBeCloseTo(357.5, 1);
    // 1M, 1M, 1M, 2M and 3M, bottom to top, at ~48.7pt per million.
    expect(
      family?.bars.map((bar) => {
        return Math.round(bar.freeEdge - family.baseline);
      }),
    ).toEqual([49, 49, 49, 97, 146]);
  });

  it("finds no bars on the OCHA choropleth", async () => {
    // The map's shapes are rectangles too: clip boxes and capital-city
    // markers. None of them share an edge, so none of them is a bar.
    expect(
      findBarFamily(
        clipToRegion({ page: await pageOf(OCHA, 1), bbox: OCHA_MAP }),
      ),
    ).toBeUndefined();
  });
});
