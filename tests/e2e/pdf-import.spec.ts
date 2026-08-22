import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  FRONTIERS_PERU_PDF_PATH,
  OCHA_SUDAN_CHOLERA_PAGE_SIZE_PT,
  OCHA_SUDAN_CHOLERA_PDF_PATH,
} from "./helpers/constants";
import { deleteDatasetViaDataManagerUiAndVerify } from "./helpers/deleteDatasetViaDataManagerUi";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
} from "./helpers/manualUploadCloudSyncFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, SHORT_WAIT } from "./helpers/timeouts";

/**
 * Copy from `useDatasetImportCopy`, rendered by `ImportStatusCallout` whenever
 * a parse ends with zero rows. A PDF with no region selected also has zero
 * rows, so this callout appearing is exactly the regression this spec guards
 * against.
 */
const PARSE_FAILURE_TITLE = "Data processing failed";
const PARSE_FAILURE_MESSAGE = "No rows were read successfully";

/** Copy from `DatasetPreview` for the PDF needs-selection state. */
const NO_REGION_TITLE = "No region selected yet";
const NO_REGION_MESSAGE = "Select a region on the page to see data";

/**
 * The choropleth panel on page 1 of the OCHA update, in PDF points measured
 * from the page's BOTTOM-left. That is the space `PdfRegionOverlay` converts a
 * drag back into, and these are the same four numbers the merge gate uses for
 * `OCHA_MAP`, so this spec extracts exactly what the gate asserts on.
 */
const OCHA_MAP_BBOX = { x0: 305, y0: 450, x1: 570, y1: 615 } as const;

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
const LABELLED_GRAPHIC_OPTION = "Labelled graphic (map, chart, tiles)";

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
const EXPECTED_MAP_ROWS: ReadonlyArray<readonly [string, string]> = [
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
const NORTH_KORDOFAN_ROW = 8;

/** What a reviewer would type to unfuse the city name from the state name. */
const CORRECTED_NORTH_KORDOFAN_LABEL = "NORTH KORDOFAN";

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
async function _drawRegionOnPdfPreview(options: {
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
async function _readReviewGridColumn(options: {
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

test.describe("PDF manual upload", () => {
  test("accepts a PDF and holds it in the needs-selection state", async ({
    page,
    e2eWorkerDb,
  }) => {
    const { workspaceSlug } = e2eWorkerDb;

    // Geometry sniffing runs in a Web Worker; an exception there would still
    // leave a plausible-looking form, so the run is failed explicitly.
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug,
    });

    await page.goto(`/${workspaceSlug}/data-manager/data-import`, {
      waitUntil: "domcontentloaded",
    });

    const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
    await uploadPanel
      .locator('input[type="file"]')
      .setInputFiles(FRONTIERS_PERU_PDF_PATH);
    await uploadPanel
      .getByRole("button", { name: "Upload", exact: true })
      .click();

    // Reaching this alert proves the dropzone accepted the file, the MIME
    // mapping resolved it to `pdf_file`, and the worker returned geometry.
    await expect(page.getByText(NO_REGION_TITLE)).toBeVisible({
      timeout: LONG_WAIT,
    });
    await expect(
      page.getByText(NO_REGION_MESSAGE, { exact: false }),
    ).toBeVisible({ timeout: SHORT_WAIT });

    // The point of the phase: "no rows yet" is an intermediate state, not a
    // failure. Both halves of the failure callout are asserted so a change to
    // either string cannot make this pass vacuously.
    await expect(page.getByText(PARSE_FAILURE_TITLE)).toBeHidden();
    await expect(page.getByText(PARSE_FAILURE_MESSAGE)).toBeHidden();

    await expect(
      page.getByRole("button", { name: "Save Dataset" }),
    ).toBeDisabled({ timeout: SHORT_WAIT });

    expect(pageErrors).toEqual([]);
  });

  /**
   * The whole path, in a real browser: upload, draw, classify, extract,
   * review, correct, save, and read the saved rows back.
   *
   * Every step after the upload is otherwise covered only by unit and
   * component tests, and the two worst defects this feature has had were both
   * invisible to those. pdf.js installs its own handler on the sniff worker's
   * port and posts internal traffic to the main thread, which the driver read
   * as an error, so no PDF could be imported at all while every unit test
   * passed; under jsdom `importScripts` does not exist, so there is no shared
   * port to model. And the review grid's corrections lived in component state,
   * so the save wrote the raw extraction and a user who fixed a row got the
   * unfixed value. The last assertion here is the one that catches the second
   * of those: it reads the saved dataset's own rows.
   */
  test("classifies a drawn map region itself, reviews a row, and saves the reviewed rows", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug } = e2eWorkerDb;

    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug,
    });

    await page.goto(`/${workspaceSlug}/data-manager/data-import`, {
      waitUntil: "domcontentloaded",
    });

    const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
    await uploadPanel
      .locator('input[type="file"]')
      .setInputFiles(OCHA_SUDAN_CHOLERA_PDF_PATH);
    await uploadPanel
      .getByRole("button", { name: "Upload", exact: true })
      .click();

    await expect(page.getByText(NO_REGION_TITLE)).toBeVisible({
      timeout: LONG_WAIT,
    });

    await _drawRegionOnPdfPreview({ page, bbox: OCHA_MAP_BBOX });

    // The card appearing is the drag having registered: `PdfRegionOverlay`
    // only calls back once a pointer-up has moved far enough from its
    // pointer-down, so a click, or a move that never reached the surface,
    // leaves the list empty.
    const regionNameInput = page.getByRole("textbox", {
      name: "Name of Region 1",
    });
    await expect(regionNameInput).toBeVisible({ timeout: SHORT_WAIT });

    // Nobody tells the picker this is a map. The region is drawn and the
    // classifier decides, and the control ends up showing the shape the rows
    // were actually read with, not the one the region was created with. This
    // is the assertion the whole default path hangs on: for a long time a
    // drawn region kept its "Numbers in prose" placeholder through every
    // extraction, so the first read of any map returned nothing at all and
    // the user had to reach for the override before they saw a single row.
    const shapeSelect = page.getByRole("combobox", { name: "Read as" });
    await expect(shapeSelect).toBeVisible({ timeout: LONG_WAIT });
    await expect(shapeSelect).toHaveValue(LABELLED_GRAPHIC_OPTION, {
      timeout: LONG_WAIT,
    });

    // Extraction has run when the grid has a row per label the map carries.
    await expect
      .poll(
        async () => {
          return (await _readReviewGridColumn({ page, columnName: "label" }))
            .length;
        },
        { timeout: LONG_WAIT },
      )
      .toBe(EXPECTED_MAP_ROWS.length);

    // The classifier reports on the region and shows its working, so a user
    // who disagrees with the shape has something to disagree with. On this
    // map that includes why the ruling lines it can see were discounted: the
    // choropleth's borders and graticule are rules, and reading them as a
    // table's is what used to make this region come back empty.
    await expect(
      page.getByText(/borders or gridlines rather than a table's rules/u),
    ).toBeVisible({ timeout: SHORT_WAIT });
    await expect(
      page.getByText(/scattered rather than tabulated/u),
    ).toBeVisible({ timeout: SHORT_WAIT });
    await expect(page.getByText("medium", { exact: true })).toBeVisible({
      timeout: SHORT_WAIT,
    });

    // What the drag actually produced, checked against the region the merge
    // gate measured rather than assumed from the coordinates.
    const labels = await _readReviewGridColumn({ page, columnName: "label" });
    const values = await _readReviewGridColumn({ page, columnName: "value" });
    expect(
      labels.map((label, index) => {
        return [label, values[index] ?? ""];
      }),
    ).toEqual(
      EXPECTED_MAP_ROWS.map((row) => {
        return [...row];
      }),
    );

    // Association by position was measured getting roughly one figure in
    // sixteen silently wrong, so the count of what still needs a human is part
    // of the product, not decoration.
    await expect(page.getByText(/6 of 18 rows need review/u)).toBeVisible({
      timeout: SHORT_WAIT,
    });

    const northKordofanLabel = page.getByRole("textbox", {
      name: `Row ${NORTH_KORDOFAN_ROW}, label`,
    });
    await expect(northKordofanLabel).toHaveValue("NORTH KORDOFAN Khartoum");
    await northKordofanLabel.fill(CORRECTED_NORTH_KORDOFAN_LABEL);
    await expect(northKordofanLabel).toHaveValue(
      CORRECTED_NORTH_KORDOFAN_LABEL,
    );

    // The counter does not move, and that is the honest reading of this
    // document: the flags mark near-tie pairings, and all six of this map's
    // near-ties are pinned by the merge gate as landing on the right state.
    // The one cell that really is wrong is the fused label, which no flag
    // points at. A reviewer here is correcting something the flags missed,
    // which is exactly why the grid is editable everywhere rather than only
    // on the cells it doubts.
    await expect(page.getByText(/6 of 18 rows need review/u)).toBeVisible({
      timeout: SHORT_WAIT,
    });

    await ensureCloudStorageCheckedAndSaveDataset({ page, workspaceSlug });

    const datasetId = parseDatasetIdFromDataManagerUrl({
      url: page.url(),
      workspaceSlug,
    });
    if (!datasetId) {
      throw new Error(`Could not parse dataset id from URL: ${page.url()}`);
    }

    let workspaceId:
      | Awaited<ReturnType<typeof getWorkspaceIdBySlug>>
      | undefined;
    try {
      workspaceId = await getWorkspaceIdBySlug({
        supabaseAdminClient: admin,
        slug: workspaceSlug,
      });

      const { data: savedDataset, error: datasetError } = await admin
        .from("datasets")
        .select("id, name, source_type")
        .eq("id", datasetId)
        .maybeSingle();
      if (datasetError) {
        throw new Error(`dataset lookup failed: ${datasetError.message}`);
      }
      expect(savedDataset?.source_type).toBe("pdf_file");

      // What the drag became, as the database stored it. The box is asserted
      // to the point, because the failure mode this catches is quiet: a
      // conversion that reads a pointer offset against the canvas's BITMAP
      // scale rather than the surface's rendered size returns a region about
      // 11% short of the one on screen, which on this map loses six states
      // off the bottom and still produces a plausible-looking table.
      const { data: savedPdfSource, error: pdfSourceError } = await admin
        .from("datasets__pdf_file")
        .select("regions")
        .eq("dataset_id", datasetId)
        .maybeSingle();
      if (pdfSourceError) {
        throw new Error(`pdf source lookup failed: ${pdfSourceError.message}`);
      }
      const savedRegions = savedPdfSource?.regions as
        | undefined
        | ReadonlyArray<{
            shape: string;
            fragments: ReadonlyArray<{ page: number; bbox: number[] }>;
          }>;

      expect(savedRegions).toHaveLength(1);
      expect(savedRegions?.[0]?.shape).toBe("labelled_graphic");
      expect(savedRegions?.[0]?.fragments[0]?.page).toBe(0);

      const savedBbox = savedRegions?.[0]?.fragments[0]?.bbox ?? [];
      expect(savedBbox[0]).toBeCloseTo(OCHA_MAP_BBOX.x0, 0);
      expect(savedBbox[1]).toBeCloseTo(OCHA_MAP_BBOX.y0, 0);
      expect(savedBbox[2]).toBeCloseTo(OCHA_MAP_BBOX.x1, 0);
      expect(savedBbox[3]).toBeCloseTo(OCHA_MAP_BBOX.y1, 0);

      // The assertion the whole spec is for. The dataset page reads its
      // preview straight out of the saved dataset, so the corrected label
      // being here, and the extractor's fused one being gone, is the reviewed
      // table having been what was written. A save built from the raw
      // extraction passes every unit test in this feature and fails here.
      await expect(
        page.getByRole("gridcell", {
          name: CORRECTED_NORTH_KORDOFAN_LABEL,
          exact: true,
        }),
      ).toBeVisible({ timeout: LONG_WAIT });
      await expect(
        page.getByRole("gridcell", {
          name: "NORTH KORDOFAN Khartoum",
          exact: true,
        }),
      ).toHaveCount(0);

      // Correcting one row must not have rewritten any other.
      await expect(
        page.getByRole("gridcell", { name: "WHITE NILE", exact: true }),
      ).toBeVisible({ timeout: SHORT_WAIT });
      await expect(
        page.getByRole("gridcell", { name: "KHARTOUM", exact: true }),
      ).toBeVisible({ timeout: SHORT_WAIT });

      expect(pageErrors).toEqual([]);
    } finally {
      if (workspaceId !== undefined) {
        await deleteDatasetViaDataManagerUiAndVerify({
          admin,
          datasetId,
          page,
          workspaceId,
          workspaceSlug,
        });
      }
    }
  });
});
