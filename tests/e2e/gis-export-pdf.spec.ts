/**
 * PDF download end to end.
 *
 * This asserts the real, user-facing outcome: clicking "Download PDF"
 * produces a browser download whose suggested filename is the slugified map
 * title plus ".pdf". It deliberately does not parse the PDF's bytes: a
 * byte-level assertion here would test `jspdf`, not this feature, and
 * `composeExportPdf.test.ts` already covers composition in unit tests.
 *
 * `captureExportMapCanvas` renders the export map offscreen with
 * `preserveDrawingBuffer` and rejects by design (see
 * `src/views/GisApp/export/captureExportMapCanvas/captureExportMapCanvas.ts`)
 * if the canvas comes back blank or the WebGL context is lost or never
 * settles: a sitrep that looks like a map but shows nothing is worse than no
 * file at all. In this environment, Playwright's headless Chromium does
 * obtain a real (SwiftShader-backed) WebGL context: this spec was iterated
 * with a printed `outcome.kind`, confirming the assertion below observes an
 * actual `download` event, not the fallback. If a future environment or
 * browser configuration cannot obtain WebGL, `captureExportMapCanvas` will
 * correctly reject and the sheet will show "The PDF could not be created"
 * instead of firing a download; the fix in that case is to assert that
 * visible error status here, never to weaken the blank-canvas check in
 * `captureExportMapCanvas.ts`, which is the feature's core safety property.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  SMALL_CALIFORNIA_CSV_PATH,
} from "./helpers/constants";
import { deleteDatasetAndShares } from "./helpers/datasetSharingCleanup";
import { deleteMapsByIds } from "./helpers/deleteMapsByIds";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import { seedAvaMap } from "./helpers/seedAvaMap";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";

const DATASET_NAME = "small-california-covid-sample.csv";
const MAP_NAME = "E2E GIS export pdf";
const EXPECTED_FILENAME_PREFIX = "e2e-gis-export-pdf";

test("downloads a PDF whose filename is the slugified map title", async ({
  page,
  e2eWorkerDb,
}) => {
  const admin = createSupabaseAdminClient();
  const { primaryUser, workspaceSlug } = e2eWorkerDb;
  let datasetId = "";
  let mapId = "";
  try {
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    mapId = await seedAvaMap({
      admin,
      workspaceId,
      ownerEmail: primaryUser.email,
      name: MAP_NAME,
    });
    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });
    datasetId = await importDatasetViaUi({
      page,
      workspaceSlug,
      filePath: SMALL_CALIFORNIA_CSV_PATH,
      expectedRowCount: SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
    });
    await page.getByRole("link", { name: "Maps" }).click();
    await page.getByRole("link", { name: `Open the map ${MAP_NAME}` }).click();
    const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
    await mapRegion.getByRole("button", { name: "Add a layer" }).click();
    await page.getByPlaceholder("Search data sources").click();
    await page.getByRole("option", { name: DATASET_NAME }).click();

    const layersPanel = page.getByRole("region", { name: "Layers" });
    const layerRow = layersPanel.getByRole("listitem").filter({
      hasText: DATASET_NAME,
    });
    await expect(layerRow).toContainText("3 rows unmapped", {
      timeout: LONG_WAIT,
    });

    await page.getByRole("button", { name: "Export" }).click();
    const exportDialog = page.getByRole("dialog", { name: "Export" });
    const downloadButton = exportDialog.getByRole("button", {
      name: "Download PDF",
    });
    await expect(downloadButton).toBeVisible({ timeout: MEDIUM_WAIT });

    const downloadEventPromise = page.waitForEvent("download", {
      timeout: LONG_WAIT,
    });
    await downloadButton.click();
    const download = await downloadEventPromise;

    const filename = download.suggestedFilename();
    expect(filename.endsWith(".pdf")).toBe(true);
    expect(filename.startsWith(EXPECTED_FILENAME_PREFIX)).toBe(true);
  } finally {
    await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
    if (datasetId) {
      await deleteDatasetAndShares({ supabaseAdminClient: admin, datasetId });
    }
  }
});
