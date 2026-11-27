import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  FRONTIERS_PERU_PDF_PATH,
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
import {
  CORRECTED_NORTH_KORDOFAN_LABEL,
  drawRegionOnPdfPreview,
  EXPECTED_MAP_ROWS,
  LABELLED_GRAPHIC_OPTION,
  NO_REGION_MESSAGE,
  NO_REGION_TITLE,
  NORTH_KORDOFAN_ROW,
  OCHA_MAP_BBOX,
  PARSE_FAILURE_MESSAGE,
  PARSE_FAILURE_TITLE,
  readReviewGridColumn,
} from "./PdfImportTestHelpers";

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

  // The whole path, in a real browser: upload, draw, classify, extract,
  // review, correct, save, and read the saved rows back.
  //
  // Keep this coverage in a real browser: pdf.js shares the sniff worker port
  // and sends internal traffic that isolated unit and jsdom tests do not
  // exercise.
  // Read the saved dataset's own rows to verify that grid corrections persist.
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

    await expect(page.getByText(NO_REGION_TITLE)).toBeVisible({
      timeout: LONG_WAIT,
    });

    await drawRegionOnPdfPreview({ page, bbox: OCHA_MAP_BBOX });

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
          return (await readReviewGridColumn({ page, columnName: "label" }))
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
    const labels = await readReviewGridColumn({ page, columnName: "label" });
    const values = await readReviewGridColumn({ page, columnName: "value" });
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
