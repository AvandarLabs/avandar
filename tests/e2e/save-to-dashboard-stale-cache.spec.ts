import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { CALIFORNIA_XLSX_PATH } from "./helpers/constants";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
} from "./helpers/manualUploadCloudSyncFlow";
import { deleteDashboardsByIds } from "./helpers/seedDashboard";
import { createSupabaseAdminClient } from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT, SHORT_WAIT } from "./helpers/timeouts";

/**
 * Regression-bait spec that demonstrates the stale react-query cache bug:
 * after saving a DataViz block to an existing dashboard, navigating to that
 * dashboard's editor shows the dashboard *without* the new block because
 * `DashboardClient.useUpdate` invalidates `QueryKeys.getAll()` but not
 * `QueryKeys.getById()`.
 *
 * The bar-chart assertion at the end is expected to FAIL until the cache
 * invalidation in `SaveToDashboardModal` is widened to include the per-id key.
 */
test.describe("Save to dashboard - stale dashboard cache", () => {
  test("bar chart saved to existing dashboard is missing in editor (expected to fail)", async ({
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
        .setInputFiles(CALIFORNIA_XLSX_PATH);
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
      await listbox.getByRole("option").first().click();

      await page
        .getByRole("button", { name: /^save to dashboard$/i })
        .click();

      // Toast confirms the save hit the database. We avoid clicking the
      // toast's "Open dashboard" link because Mantine notifications auto-
      // dismiss before a slow CI click can land. Instead we use the sidebar
      // Dashboards link + the dashboard card; both are client-side
      // navigations that keep the react-query cache live (a hard reload
      // via `page.goto` would mask the stale-cache bug).
      await expect(
        page.getByText(/added to "untitled dashboard"/i),
      ).toBeVisible({ timeout: SHORT_WAIT });

      await page.getByRole("link", { name: /^dashboards$/i }).click();
      await expect(page).toHaveURL(
        new RegExp(`/${workspaceSlug}/dashboards/?$`),
        { timeout: SHORT_WAIT },
      );
      // The dashboard card wraps the title text in a Mantine Card with a
      // JS onClick (no link role), so target the card root and click that.
      const dashboardCard = page
        .locator('[class*="mantine-Card-root"]')
        .filter({ hasText: "Untitled dashboard" })
        .first();
      await dashboardCard.click();
      await expect(page).toHaveURL(
        new RegExp(`/dashboards/edit/${dashboardId}`),
        { timeout: SHORT_WAIT },
      );

      // Step 6: The dashboard editor uses `useGetById`, which still holds
      // the pre-save config in cache because `useUpdate` only invalidates
      // `getAll`. The bar block we just saved is therefore absent from the
      // Puck canvas iframe. The next assertion is expected to FAIL until
      // SaveToDashboardModal also invalidates `getById({ id })`.
      const editorFrame = page.locator("iframe").first().contentFrame();
      await expect(
        editorFrame.locator(".recharts-bar").first(),
      ).toBeVisible({ timeout: MEDIUM_WAIT });
    } finally {
      await deleteDashboardsByIds({ admin, dashboardIds: createdDashboardIds });
    }
  });
});
