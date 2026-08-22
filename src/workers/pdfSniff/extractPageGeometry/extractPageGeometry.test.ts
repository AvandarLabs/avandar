import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { loadPdfDocument } from "../loadPdfDocument/loadPdfDocument";
import { extractPageGeometry } from "./extractPageGeometry";

const FRONTIERS =
  "public/test-data/pdf/frontiers-peru-child-health-insurance.pdf";
const PLOS_NCD = "public/test-data/pdf/plos-one-ncd-mobile-phone-surveys.pdf";
const OCHA =
  "public/test-data/pdf/gate/ocha-sudan-cholera-update-2025-07-03.pdf";

async function geometryForPage(path: string, pageNumber: number) {
  const bytes = await readFile(path);
  const doc = await loadPdfDocument(new Uint8Array(bytes));
  const page = await doc.getPage(pageNumber);
  const geometry = await extractPageGeometry({
    page: page,
    pageIndex: pageNumber - 1,
  });
  await doc.destroy();
  return geometry;
}

describe("extractPageGeometry", () => {
  it("reports page dimensions in points", async () => {
    const geometry = await geometryForPage(FRONTIERS, 1);
    // A4 is 595 x 842 points.
    expect(Math.round(geometry.width)).toBe(595);
    expect(Math.round(geometry.height)).toBe(842);
  });

  it("returns text items sorted top-to-bottom then left-to-right", async () => {
    // pdf.js returns items in content-stream order, which routinely differs
    // from visual order. Every detector depends on this sort, so it is
    // asserted here rather than assumed.
    const geometry = await geometryForPage(FRONTIERS, 1);
    const items = geometry.textItems;

    expect(items.length).toBeGreaterThan(50);

    for (let i = 1; i < items.length; i += 1) {
      const previous = items[i - 1]!;
      const current = items[i]!;
      const isBelow = current.y < previous.y - 1;
      const isSameLineAndRight =
        Math.abs(current.y - previous.y) <= 1 && current.x >= previous.x;
      expect(isBelow || isSameLineAndRight).toBe(true);
    }
  });

  it("extracts horizontal ruling lines from a ruled page", async () => {
    // Journal tables are ruled horizontally. Page 4 of the Frontiers paper
    // holds Table 1's continuation.
    const geometry = await geometryForPage(FRONTIERS, 4);
    const horizontal = geometry.rules.filter((r) => {
      return r.orientation === "horizontal";
    });

    expect(horizontal.length).toBeGreaterThan(2);
  });

  it("flags a page with real text as not scanned", async () => {
    const geometry = await geometryForPage(PLOS_NCD, 1);
    expect(geometry.looksScanned).toBe(false);
  });

  it("reports unmapped characters where the ToUnicode map is broken", async () => {
    // PLOS renders some decimal points with a private-use glyph, so e.g.
    // "27.2%" extracts as "27<PUA>2%". We must notice rather than import
    // mojibake. Verified against the raw text content: page 6 has no such
    // glyphs; page 8 does, in risk-ratio figures such as "(RR: 1<PUA>19,
    // 95% CI: 1<PUA>08-1<PUA>31, p<0.001)".
    const geometry = await geometryForPage(PLOS_NCD, 8);
    const worstItem = geometry.textItems.reduce((worst, item) => {
      return item.unmappedCharRatio > worst ? item.unmappedCharRatio : worst;
    }, 0);

    expect(worstItem).toBeGreaterThan(0);
  });

  it("keeps the OCHA trend chart's area path as a closed mark", async () => {
    const geometry = await geometryForPage(OCHA, 1);
    const area = geometry.marks.filter((mark) => {
      return (
        mark.kind === "closed" &&
        mark.bbox[0] > 60 &&
        mark.bbox[2] < 560 &&
        mark.bbox[1] > 80 &&
        mark.bbox[3] < 200 &&
        mark.points.length >= 20
      );
    });

    expect(area).toHaveLength(1);
    expect(area[0]!.points.length).toBe(28);
    expect(geometry.marksTruncated).toBe(false);
  });
});
