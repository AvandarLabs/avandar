import { expect } from "./fixtures/e2e.fixture";
import { OCHA_SUDAN_CHOLERA_PAGE_SIZE_PT } from "./helpers/constants";
import { LONG_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";

/**
 * Copy from `useDatasetImportCopy`, rendered by `ImportStatusCallout` whenever
 * a parse ends with zero rows. A PDF with no region selected also has zero
 * rows, so this callout appearing is exactly the regression this spec guards
 * against.
 */
export const PARSE_FAILURE_TITLE = "Data processing failed";

/** Expected visible recovery message for a failed PDF extraction. */
export const PARSE_FAILURE_MESSAGE = "No rows were read successfully";

/** Copy from `DatasetPreview` for the PDF needs-selection state. */
export const NO_REGION_TITLE = "Choose what to read";

/** Expected visible guidance when no PDF table region is selected. */
export const NO_REGION_MESSAGE =
  "Draw a box around a table, chart, or block of text";

/**
 * The choropleth panel on page 1 of the OCHA update, in PDF points measured
 * from the page's BOTTOM-left. That is the space `PdfRegionOverlay` converts a
 * drag back into, and these are the same four numbers the merge gate uses for
 * `OCHA_MAP`, so this spec extracts exactly what the gate asserts on.
 */
export const OCHA_MAP_BBOX = { x0: 305, y0: 450, x1: 570, y1: 615 } as const;

/**
 * Copy from `PdfRegionCard`'s shape options, and what the "Read as" control
 * must show for the map region without anyone selecting it.
 *
 * The override itself is still a supported path and is covered where it can be
 * asserted precisely: `PdfRegionPicker.test.tsx` for the control recording the
 * user's choice, and `pdfSniff.worker.test.ts` for that choice surviving the
 * next classification. What only a browser can show is the default path, so
 * that is what this spec drives.
 */
export const LABELLED_GRAPHIC_OPTION = "Labelled graphic (map, chart, tiles)";

/**
 * Every row the map region yields, in the order `extractLabelledGraphic`
 * emits them, as `[label, value]`.
 *
 * Asserting the whole list in order is what proves the drag landed on the
 * region the gate measured: a box a few points out drops a state label or
 * picks up a legend bin, and either would change this list. The two empty
 * values are West Darfur and Central Darfur, which the map shades but does not
 * label; the extractor reports them as rows with no figure rather than
 * dropping them.
 *
 * "NORTH KORDOFAN Khartoum" is a KNOWN DEFECT pinned by the merge gate: the
 * capital-city annotation sits 6.8 points from the state label, inside the
 * 8-point fusion window of `assembleLabels`. Its VALUE is right. It is the
 * row this spec corrects in the review grid, because it is the exact case the
 * review grid exists for.
 */
export const EXPECTED_MAP_ROWS: ReadonlyArray<readonly [string, string]> = [
  ["BLUE NILE", "6"],
  ["AJ JAZIRAH", "238"],
  ["SOUTH KORDOFAN", "11"],
  ["SOUTH DARFUR", "24"],
  ["GEDAREF", "225"],
  ["KASSALA", "200"],
  ["SENNAR", "202"],
  ["NORTH KORDOFAN Khartoum", "224"],
  ["WHITE NILE", "432"],
  ["EAST DARFUR", "15"],
  ["RED SEA", "25"],
  ["WEST KORDOFAN", "1"],
  ["KHARTOUM", "408"],
  ["NORTHERN", "29"],
  ["NORTH DARFUR", "1"],
  ["RIVER NILE", "83"],
  ["WEST DARFUR", ""],
  ["CENTRAL DARFUR", ""],
];

/** One-based row number of "NORTH KORDOFAN Khartoum" in the review grid. */
export const NORTH_KORDOFAN_ROW = 8;

/** What a reviewer would type to unfuse the city name from the state name. */
export const CORRECTED_NORTH_KORDOFAN_LABEL = "NORTH KORDOFAN";

/**
 * Drags a box over the rendered page preview.
 *
 * The overlay is the one place that knows how a pointer position becomes PDF
 * points, so the conversion is mirrored here rather than guessed at: x scales
 * straight, and y is flipped against the page height because PDF y grows
 * upward while screen y grows downward. The scale comes from the overlay's own
 * rendered width, so a change to `PREVIEW_WIDTH` moves this drag with it.
 *
 * The pointer is moved in steps between down and up. A single jump produces no
 * intermediate `pointermove`, which is what the overlay draws its preview
 * rectangle from, so the drag would register very differently from a human's.
 */
export async function drawRegionOnPdfPreview(options: {
  page: Page;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}): Promise<void> {
  const { page, bbox } = options;
  const overlay = page.getByTestId("pdf-region-overlay");

  await expect(overlay).toBeVisible({ timeout: LONG_WAIT });

  // The overlay is sized from the page size the canvas reports after it has
  // rendered, and it falls back to A4 until then. Waiting for the canvas to
  // have real pixels means the drag is converted with this document's own
  // page size rather than the fallback.
  const canvas = page.locator("canvas").first();
  await expect
    .poll(
      async () => {
        return canvas.evaluate((node) => {
          return (node as HTMLCanvasElement).width;
        });
      },
      { timeout: LONG_WAIT },
    )
    .toBeGreaterThan(0);

  await overlay.scrollIntoViewIfNeeded();
  const overlayBox = await overlay.boundingBox();
  if (!overlayBox) {
    throw new Error("The PDF region overlay has no layout box to drag on.");
  }

  const scale = overlayBox.width / OCHA_SUDAN_CHOLERA_PAGE_SIZE_PT.width;
  const toScreen = (xPt: number, yPt: number): { x: number; y: number } => {
    return {
      x: overlayBox.x + xPt * scale,
      y: overlayBox.y + (OCHA_SUDAN_CHOLERA_PAGE_SIZE_PT.height - yPt) * scale,
    };
  };

  // The drag starts at the region's top-left on screen, which is its highest
  // y in PDF points.
  const from = toScreen(bbox.x0, bbox.y1);
  const to = toScreen(bbox.x1, bbox.y0);

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, {
    steps: 8,
  });
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

/**
 * The values of one review-grid column, top to bottom.
 *
 * `PdfReviewGrid` renders every cell as a text input labelled
 * `Row {n}, {column}`, which is both what a screen reader reads and the only
 * handle on a cell whose text lives in an input's value rather than in the
 * DOM.
 */
export async function readReviewGridColumn(options: {
  page: Page;
  columnName: string;
}): Promise<string[]> {
  return options.page
    .getByRole("textbox", {
      name: new RegExp(`^Row \\d+, ${options.columnName}$`, "u"),
    })
    .evaluateAll((nodes) => {
      return nodes.map((node) => {
        return (node as HTMLInputElement).value;
      });
    });
}
