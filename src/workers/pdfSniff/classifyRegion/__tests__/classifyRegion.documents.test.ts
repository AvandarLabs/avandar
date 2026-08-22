import type { BBox, PageGeometry } from "../../pdfSniff.types";

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { clipToRegion } from "../../clipToRegion/clipToRegion";
import { extractPageGeometry } from "../../extractPageGeometry/extractPageGeometry";
import { loadPdfDocument } from "../../loadPdfDocument/loadPdfDocument";
import { classifyRegion } from "../classifyRegion";

/*
 * The classifier, run on real documents rather than on hand-built geometry.
 *
 * Both directions are asserted here on purpose. A rule that separates a map
 * from a table on the map alone is worth nothing: the failure it would cause
 * is a real ruled table read as a graphic, which is silent, so every change to
 * the ruled-table signal has to be shown against both a document that has one
 * and a document that only looks like it does.
 *
 * Measured on these regions (see the region constants for the boxes):
 *
 *   region                     horizontal rules   aligned columns   verdict
 *   OCHA choropleth                          17                 0   graphic
 *   OCHA weekly trend chart                  34                 0   graphic
 *   Frontiers Table 1, page 5                 3                 3   table
 *   Frontiers Table 1, page 6                 2                 3   table
 *
 * The rule COUNT does not separate them, and neither does rule width: five of
 * the trend chart's rules span 88% or more of the region, against 79% to 98%
 * for the table's three. Whether the text lines up in columns does.
 */

const OCHA =
  "public/test-data/pdf/gate/ocha-sudan-cholera-update-2025-07-03.pdf";
const FRONTIERS =
  "public/test-data/pdf/frontiers-peru-child-health-insurance.pdf";

/** The choropleth panel on page 1, the same box the merge gate reads. */
const OCHA_MAP: BBox = [305, 450, 570, 615];

/** The weekly cholera cases trend chart at the foot of page 1. */
const OCHA_TREND: BBox = [30, 55, 570, 215];

/**
 * Table 1 of the Frontiers paper, on the two pages it spans, excluding each
 * page's caption, running head and footer.
 *
 * This is the ruled table the discriminator must not lose. Frontiers house
 * style rules a table horizontally only, so it is also the weakest form of
 * ruled table there is: no vertical rules, no cell borders.
 */
const FRONTIERS_TABLE_PAGE_5: BBox = [45, 70, 550, 745];
const FRONTIERS_TABLE_PAGE_6: BBox = [45, 95, 550, 750];

async function pageOf(path: string, pageNumber: number): Promise<PageGeometry> {
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

describe("classifyRegion on real documents", () => {
  it("calls the OCHA choropleth a labelled graphic", async () => {
    const region = clipToRegion({
      page: await pageOf(OCHA, 1),
      bbox: OCHA_MAP,
    });
    const result = classifyRegion(region);

    // The rules really are there. They are the map's frame and its state
    // borders, and reading them as a table's rules is what made the first
    // extraction after every drag return nothing.
    expect(
      region.rules.filter((rule) => {
        return rule.orientation === "horizontal";
      }).length,
    ).toBeGreaterThanOrEqual(2);
    expect(result.shape).toBe("labelled_graphic");
    expect(result.evidence.join(" ")).toMatch(
      /borders or gridlines rather than a table's rules/iu,
    );
  });

  it("calls the OCHA weekly trend chart a labelled graphic", async () => {
    const region = clipToRegion({
      page: await pageOf(OCHA, 1),
      bbox: OCHA_TREND,
    });
    const result = classifyRegion(region);

    expect(result.shape).toBe("labelled_graphic");
  });

  it("still calls a horizontally ruled journal table a grid table", async () => {
    const region = clipToRegion({
      page: await pageOf(FRONTIERS, 5),
      bbox: FRONTIERS_TABLE_PAGE_5,
    });
    const result = classifyRegion(region);

    expect(result.shape).toBe("grid_table");
    expect(result.confidence).toBe("high");
    expect(result.evidence.join(" ")).toMatch(/aligned in \d+ columns/iu);
  });

  it("still calls the table's continuation page a grid table", async () => {
    // Two rules rather than three, because the continuation carries no top
    // caption rule. The verdict has to survive that.
    const region = clipToRegion({
      page: await pageOf(FRONTIERS, 6),
      bbox: FRONTIERS_TABLE_PAGE_6,
    });

    expect(classifyRegion(region).shape).toBe("grid_table");
  });
});
