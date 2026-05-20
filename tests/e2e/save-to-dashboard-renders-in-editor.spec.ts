import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { SMALL_CALIFORNIA_XLSX_PATH } from "./helpers/constants";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
} from "./helpers/manualUploadCloudSyncFlow";
import {
  deleteAllDashboardsForOwner,
  deleteDashboardsByIds,
} from "./helpers/seedDashboard";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT, SHORT_WAIT } from "./helpers/timeouts";

const TARGET_DASHBOARD_NAME = "E2E renders-in-editor target";

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
    test.setTimeout(120_000);

    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });

    // Earlier specs in the same worker leave dashboards behind (e.g.
    // dataviz-pblock-visualizations seeds nine). Clear them so the save
    // modal list only contains the dashboard this test creates.
    await deleteAllDashboardsForOwner({
      admin,
      workspaceId,
      ownerEmail: primaryUser.email,
    });

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
        .setInputFiles(SMALL_CALIFORNIA_XLSX_PATH);
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

      // Step 2: Create an empty dashboard via the UI, then save it so the
      // editor's "unsaved changes" flag clears.
      await page.goto(`/${workspaceSlug}/dashboards`);
      await page
        .getByRole("button", { name: "Create a dashboard" })
        .first()
        .click();

      await expect(page).toHaveURL(
        new RegExp(`/${workspaceSlug}/dashboards/edit/`),
        { timeout: MEDIUM_WAIT },
      );

      const dashboardEditUrlMatch = page
        .url()
        .match(/dashboards\/edit\/([0-9a-f-]{36})/i);
      const dashboardId = dashboardEditUrlMatch?.[1];
      if (!dashboardId) {
        throw new Error(
          `Could not parse dashboard id from URL: ${page.url()}`,
        );
      }
      createdDashboardIds.push(dashboardId);

      // Save the empty dashboard (header has a Save button in the editor).
      await page.getByRole("button", { name: /^save$/i }).click();
      await expect(
        page.getByText(/dashboard saved successfully/i),
      ).toBeVisible({ timeout: MEDIUM_WAIT });

      const { error: renameError } = await admin
        .from("dashboards")
        .update({ name: TARGET_DASHBOARD_NAME })
        .eq("id", dashboardId);
      if (renameError) {
        throw new Error(
          `Failed to rename dashboard for e2e: ${renameError.message}`,
        );
      }

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
      await expect(
        page.locator(".recharts-bar").first(),
      ).toBeVisible({ timeout: MEDIUM_WAIT });

      // Step 5: Open Save -> Save to dashboard, pick the dashboard we made.
      await page.getByRole("button", { name: /^save$/i }).click();
      await page
        .getByRole("menuitem", { name: /save to dashboard/i })
        .click();

      const listbox = page.getByRole("listbox", { name: /dashboards/i });
      await expect(listbox).toBeVisible({ timeout: SHORT_WAIT });
      await listbox
        .getByRole("option", { name: TARGET_DASHBOARD_NAME })
        .click();

      await page
        .getByRole("button", { name: /^save to dashboard$/i })
        .click();

      // Toast confirms the save hit the database. We navigate via the
      // sidebar (instead of the toast link) because Mantine notifications
      // auto-dismiss quickly and a slow CI click can miss them.
      await expect(
        page.getByText(`Added to "${TARGET_DASHBOARD_NAME}"`),
      ).toBeVisible({ timeout: LONG_WAIT });

      await page.getByRole("link", { name: /^dashboards$/i }).click();
      await expect(page).toHaveURL(
        new RegExp(`/${workspaceSlug}/dashboards/?$`),
        { timeout: SHORT_WAIT },
      );
      // The dashboard card wraps the title text in a Mantine Card with a
      // JS onClick (no link role), so target the card root and click that.
      const dashboardCard = page
        .locator('[class*="mantine-Card-root"]')
        .filter({ hasText: TARGET_DASHBOARD_NAME })
        .first();
      await dashboardCard.click();
      await expect(page).toHaveURL(
        new RegExp(`/dashboards/edit/${dashboardId}`),
        { timeout: MEDIUM_WAIT },
      );

      await expect(page.getByLabel("loading")).toBeHidden({
        timeout: LONG_WAIT,
      });

      // Step 6: The DataViz block we appended should render inside the
      // Puck canvas iframe. If the block was saved without a usable
      // `nlQuery.prompt`, DataVizPBlock short-circuits to its "add a
      // prompt" placeholder and the bar chart never appears.
      await expect(async () => {
        const editorFrame = page.locator("iframe").first().contentFrame();
        await expect(
          editorFrame.locator(".recharts-bar").first(),
        ).toBeVisible({ timeout: SHORT_WAIT });
      }).toPass({ timeout: LONG_WAIT });
    } finally {
      await deleteDashboardsByIds({ admin, dashboardIds: createdDashboardIds });
    }
  });
});
