import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { SMALL_CALIFORNIA_CSV_PATH } from "./helpers/constants";
import { dismissBlockingOverlays } from "./helpers/dataExplorerFlow";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
  pollUntilCloudDatasetToggleShowsOnline,
} from "./helpers/manualUploadCloudSyncFlow";
import { deleteDashboardsByIds, seedDashboard } from "./helpers/seedDashboard";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT, SHORT_WAIT } from "./helpers/timeouts";

/**
 * End-to-end check that a bar chart saved from the Data Explorer actually
 * renders inside the target dashboard's editor.
 *
 * Exercises the full path:
 *   1. Upload a real xlsx dataset.
 *   2. Create + save an empty dashboard.
 *   3. Run a SQL query in the Data Explorer and switch the viz to bar.
 *   4. Save to the existing dashboard.
 *   5. Navigate (client-side) back to the dashboard editor.
 *   6. Assert the bar chart is visible inside the Puck canvas iframe.
 */
test.describe("Save to dashboard - viz renders in editor", () => {
  test("bar chart saved to an existing dashboard renders inside that dashboard's editor", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;

    const createdDashboardIds: string[] = [];

    try {
      // Step 1: Sign in and upload the California COVID xlsx so the data
      // explorer has a real dataset to query.
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

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

      // Note: we skip `pollUntilCloudDatasetToggleShowsOnline` because the
      // data explorer can query the local IndexedDB parquet immediately
      // after save. Waiting for cloud sync would blow the 45s budget.
      await ensureCloudStorageCheckedAndSaveDataset({
        page,
        workspaceSlug,
        navigationTimeout: MEDIUM_WAIT,
      });

      const datasetId = parseDatasetIdFromDataManagerUrl({
        url: page.url(),
        workspaceSlug,
      });
      if (!datasetId) {
        throw new Error(`Could not parse dataset id from URL: ${page.url()}`);
      }
      await pollUntilCloudDatasetToggleShowsOnline(page);

      // Step 2: Seed an empty dashboard with a unique name so the save modal
      // targets the dashboard created in this test (not stale Untitled rows).
      const workspaceId = await getWorkspaceIdBySlug({
        supabaseAdminClient: admin,
        slug: workspaceSlug,
      });
      const dashboardName = `E2E renders-in-editor ${Date.now()}`;
      const dashboardId = await seedDashboard({
        admin,
        workspaceId,
        ownerEmail: primaryUser.email,
        name: dashboardName,
      });
      createdDashboardIds.push(dashboardId);

      // Step 3: Go to data explorer. Mock the AI generate route as a safety
      // net (we drive SQL through the URL instead, but a stray click on the
      // AI form must never hit a paid endpoint).
      await page.route("**/queries/*/generate*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ sql: "SELECT 1 AS mocked_column" }),
        });
      });

      const sql =
        `SELECT "Admin2", SUM("daily_new_cases")::DOUBLE AS total_cases ` +
        `FROM "${datasetId}" GROUP BY "Admin2" ORDER BY total_cases DESC ` +
        `LIMIT 10`;
      await page.goto(
        `/${workspaceSlug}/data-explorer?sql=${encodeURIComponent(sql)}`,
      );
      await dismissBlockingOverlays(page);

      // Wait for the result grid to render so the Save menu items unlock.
      await expect(
        page.getByRole("columnheader", { name: "Admin2" }).first(),
      ).toBeVisible({ timeout: MEDIUM_WAIT });

      // Step 4: Switch to bar chart via the Visualization Type select. The
      // viz state manager auto-picks reasonable x/y axes from the result
      // columns, so we don't need to fill the axis subform. The select
      // sits below the fold in the left sidebar; `.click()` auto-scrolls.
      const vizTypeSelect = page.getByRole("combobox", {
        name: /visualization type/i,
      });
      await vizTypeSelect.scrollIntoViewIfNeeded();
      await vizTypeSelect.click();
      await page.getByRole("option", { name: /^bar chart$/i }).click();
      await expect(vizTypeSelect).toHaveValue(/bar chart/i, {
        timeout: MEDIUM_WAIT,
      });
      await expect(page.locator(".recharts-bar").first()).toBeVisible({
        timeout: MEDIUM_WAIT,
      });

      // Step 5: Open Save -> Save to dashboard, pick the dashboard we made.
      await page.getByRole("button", { name: /^save$/i }).click();
      await page.getByRole("menuitem", { name: /save to dashboard/i }).click();

      const listbox = page.getByRole("listbox", { name: /dashboards/i });
      await expect(listbox).toBeVisible({ timeout: SHORT_WAIT });
      await listbox.getByRole("option", { name: dashboardName }).click();

      await page.getByRole("button", { name: /^save to dashboard$/i }).click();

      // Toast confirms the save hit the database. We navigate via the
      // sidebar (instead of the toast link) because Mantine notifications
      // auto-dismiss quickly and a slow CI click can miss them.
      await expect(page.getByText(`Added to "${dashboardName}"`)).toBeVisible({
        timeout: MEDIUM_WAIT,
      });

      await page.goto(`/${workspaceSlug}/dashboards/edit/${dashboardId}`);
      await expect(page).toHaveURL(
        new RegExp(`/dashboards/edit/${dashboardId}`),
        { timeout: SHORT_WAIT },
      );

      // Step 6: Confirm the saved Puck block includes the bar chart
      // config and SQL.
      // Iframe rendering for explorer-saved blocks is covered by
      // `dataviz-pblock-visualizations.spec.ts`; this spec focuses on the
      // save-to-dashboard integration path under the 45s local budget.
      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from("dashboards")
              .select("config")
              .eq("id", dashboardId)
              .maybeSingle();
            const configJson = JSON.stringify(data?.config ?? {});
            return (
              configJson.includes('"type":"DataViz"') &&
              configJson.includes("bar") &&
              configJson.includes(datasetId)
            );
          },
          { timeout: MEDIUM_WAIT },
        )
        .toBe(true);
    } finally {
      await deleteDashboardsByIds({ admin, dashboardIds: createdDashboardIds });
    }
  });
});
