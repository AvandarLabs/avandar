import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  SMALL_CALIFORNIA_CSV_PATH,
} from "./helpers/constants";
import { createDashboardWithDataVizBlock } from "./helpers/createDashboardWithDataVizBlock";
import { deleteDatasetAndShares } from "./helpers/datasetSharingCleanup";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
  pollUntilCloudDatasetToggleShowsOnline,
} from "./helpers/manualUploadCloudSyncFlow";
import { deleteDashboardsByIds } from "./helpers/seedDashboard";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT } from "./helpers/timeouts";

/**
 * Regression test for the Export-PDF → Annotate flow for dashboards that
 * contain an ag-grid table visualization.
 *
 * ag-grid v35's theme emits border colors using the modern CSS `color(srgb …)`
 * function. The previous snapshot library (`html2canvas` 1.4.x) cannot parse
 * `color()`, so the capture threw mid-flight, the annotation step fell back to
 * the "Couldn't capture the dashboard for annotation." error state, and the
 * direct-download path showed an error toast instead of producing a PDF.
 *
 * This test exercises the annotate path end-to-end — we cannot validate the
 * downloaded PDF binary from Playwright, but proving that the annotation
 * canvas mounts (i.e. `snapshotElement` returned without throwing) is enough
 * to cover the regression: both export paths share the same capture.
 */
test.describe("Dashboard PDF export — table visualization", () => {
  test("annotation step mounts the snapshot canvas for an ag-grid table", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const createdDashboardIds: string[] = [];
    let datasetId = "";

    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      // Defensive stub: nothing in this test should call the AI route, but
      // if a hidden code path does, never let it escape to a paid request.
      await page.route("**/queries/*/generate*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ sql: "SELECT 1 AS mocked_column" }),
        });
      });

      // Upload the small CSV so the seeded dashboard has a real dataset to
      // query (table viz fetches rows on render, just like in production).
      await page.goto(`/${workspaceSlug}/data-manager/data-import`);
      const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
      await uploadPanel
        .locator('input[type="file"]')
        .setInputFiles(SMALL_CALIFORNIA_CSV_PATH);
      await uploadPanel
        .getByRole("button", { name: "Upload", exact: true })
        .click();

      await expect(
        page.getByText("Data processed successfully", { exact: false }),
      ).toBeVisible({ timeout: MEDIUM_WAIT });
      const formattedRowCount =
        SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT.toLocaleString("en-US");
      await expect(
        page.getByText(`Parsed ${formattedRowCount} rows successfully`),
      ).toBeVisible({ timeout: MEDIUM_WAIT });

      await ensureCloudStorageCheckedAndSaveDataset({ page, workspaceSlug });
      const parsedDatasetId = parseDatasetIdFromDataManagerUrl({
        url: page.url(),
        workspaceSlug,
      });
      if (!parsedDatasetId) {
        throw new Error(`Could not parse dataset id from URL: ${page.url()}`);
      }
      datasetId = parsedDatasetId;
      await pollUntilCloudDatasetToggleShowsOnline(page);

      const workspaceId = await getWorkspaceIdBySlug({
        supabaseAdminClient: admin,
        slug: workspaceSlug,
      });

      // Seed a dashboard with a single ag-grid table block.
      const dashboardId = await createDashboardWithDataVizBlock({
        admin,
        workspaceId,
        ownerEmail: primaryUser.email,
        rawSql: `SELECT "Admin2", "daily_new_cases" FROM "${datasetId}" LIMIT 10`,
        vizConfig: { vizType: "table" },
        name: "E2E PDF Export Table",
      });
      createdDashboardIds.push(dashboardId);

      await page.goto(`/${workspaceSlug}/dashboards/edit/${dashboardId}`);

      // Make sure the table block actually rendered inside the editor frame
      // before we trigger the export — `Export PDF` is disabled until the
      // dashboard is loaded.
      const editorFrame = page.locator("iframe").first().contentFrame();
      await expect(
        editorFrame.locator('[role="columnheader"]').first(),
      ).toBeVisible({ timeout: MEDIUM_WAIT });

      await page.getByRole("button", { name: "Export PDF" }).click();
      await page
        .getByRole("button", { name: "Annotate, then export" })
        .click();

      // The annotation canvas mounts as an <img alt="Dashboard snapshot">
      // (the captured frame) plus the overlay <canvas>. Asserting the image
      // is visible is the most direct signal that `snapshotElement` produced
      // pixels — the fallback path renders only the red error text.
      await expect(
        page.getByRole("img", { name: "Dashboard snapshot" }),
      ).toBeVisible({ timeout: MEDIUM_WAIT });
    } finally {
      await deleteDashboardsByIds({ admin, dashboardIds: createdDashboardIds });
      if (datasetId) {
        await deleteDatasetAndShares({
          supabaseAdminClient: admin,
          datasetId,
        });
      }
    }
  });
});
