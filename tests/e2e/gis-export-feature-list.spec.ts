/**
 * Feature list in the PDF, end to end.
 *
 * Turning on "Include a feature list" in the export sheet and downloading
 * produces a PDF whose list follows the map on its own pages, so the file
 * has more than one page and carries the list's summary line. The page count
 * is read from the file's page dictionaries; the table's layout is covered
 * by `drawExportFeatureTable.test.ts` and `composeExportPdf.test.ts`.
 *
 * The data is a CSV in `tests/data/gis/` imported through the UI by the
 * worker's own account, so the spec needs nothing seeded beforehand. When
 * `E2E_PDF_PNG_DIR` is set, the downloaded PDF is also copied there so its
 * pages can be rendered for review.
 */
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  GIS_DATED_POINTS_CSV_PATH,
  GIS_DATED_POINTS_ROW_COUNT,
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
import { E2E_ONLINE_TAG } from "./setup/ensureE2EViteFeatureFlags/ensureE2EViteFeatureFlags";

const POINT_DATASET_NAME = "dated-points.csv";
const MAP_NAME = "E2E GIS export feature list";

/** The line printed above the table: every row of the CSV, in its layer. */
const EXPECTED_SUMMARY_LINE = `${GIS_DATED_POINTS_ROW_COUNT} features in ${POINT_DATASET_NAME}`;

/** A jsPDF file's page dictionaries. `/Type /Pages` is the page tree. */
function _countPdfPages(pdfText: string): number {
  return pdfText.match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;
}

/** Keeps a copy of the downloaded PDF when a review directory is given. */
async function _keepPdfForReview(pdfPath: string): Promise<void> {
  const reviewDir = process.env.E2E_PDF_PNG_DIR;
  if (!reviewDir) {
    return;
  }
  await mkdir(reviewDir, { recursive: true });
  await copyFile(pdfPath, path.join(reviewDir, "export-feature-list.pdf"));
}

test(
  "downloads a PDF with the feature list on pages after the map",
  { tag: E2E_ONLINE_TAG },
  async ({ page, e2eWorkerDb }) => {
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
        filePath: GIS_DATED_POINTS_CSV_PATH,
        expectedRowCount: GIS_DATED_POINTS_ROW_COUNT,
      });
      await page.getByRole("link", { name: "Maps" }).click();
      await page
        .getByRole("link", { name: `Open the map ${MAP_NAME}` })
        .click();
      const mapRegion = page.getByRole("region", {
        name: new RegExp(MAP_NAME),
      });
      await mapRegion.getByRole("button", { name: "Add a layer" }).click();
      await page.getByPlaceholder("Search data sources").click();
      await page.getByRole("option", { name: POINT_DATASET_NAME }).click();
      const inspector = page.getByRole("region", {
        name: POINT_DATASET_NAME,
        exact: true,
      });
      await expect(
        inspector.getByText(
          `${GIS_DATED_POINTS_ROW_COUNT} of ${GIS_DATED_POINTS_ROW_COUNT} rows mapped`,
        ),
      ).toBeVisible({ timeout: LONG_WAIT });

      await page.getByRole("button", { name: "Export" }).click();
      const exportDialog = page.getByRole("dialog", { name: "Export" });
      await exportDialog
        .getByRole("switch", { name: "Include a feature list" })
        .click();
      await expect(
        exportDialog.getByRole("combobox", { name: "Layer" }),
      ).toHaveValue(POINT_DATASET_NAME, { timeout: MEDIUM_WAIT });

      const downloadEventPromise = page.waitForEvent("download", {
        timeout: LONG_WAIT,
      });
      await exportDialog.getByRole("button", { name: "Download PDF" }).click();
      const download = await downloadEventPromise;
      const pdfPath = await download.path();
      await _keepPdfForReview(pdfPath);
      const pdfText = await readFile(pdfPath, "latin1");

      expect(_countPdfPages(pdfText)).toBeGreaterThan(1);
      expect(pdfText).toContain(`(${EXPECTED_SUMMARY_LINE})`);
    } finally {
      await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
      if (datasetId) {
        await deleteDatasetAndShares({ supabaseAdminClient: admin, datasetId });
      }
    }
  },
);
