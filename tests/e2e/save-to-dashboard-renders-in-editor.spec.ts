import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  deleteAllDashboardsForOwner,
  deleteDashboardsByIds,
} from "./helpers/seedDashboard";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT, SHORT_WAIT } from "./helpers/timeouts";

/**
 * End-to-end check that a bar chart saved from the Data Explorer actually
 * renders inside the target dashboard's editor.
 *
 * Exercises the full path:
 *   1. Sign in (the viz is seeded from a constant query, so no dataset upload
 *      is needed; see Step 3).
 *   2. Create + save an empty dashboard.
 *   3. Run a constant SQL query in the Data Explorer and switch the viz to bar.
 *   4. Save to the existing dashboard.
 *   5. Navigate (client-side) back to the dashboard editor.
 *   6. Assert the bar chart is visible inside the Puck canvas iframe.
 */
test.describe("Data Explorer: save viz to dashboard", () => {
  test("bar chart saved to an existing dashboard renders inside that dashboard's editor", async ({
    page,
    e2eWorkerDb,
  }) => {
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
      // Step 1: Sign in. The bar chart is seeded from a constant query in
      // Step 3, so this test needs no uploaded dataset.
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

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
        throw new Error(`Could not parse dashboard id from URL: ${page.url()}`);
      }
      createdDashboardIds.push(dashboardId);

      // Save the empty dashboard (header has a Save button in the editor).
      await page.getByRole("button", { name: /^save$/i }).click();
      await expect(page.getByText(/dashboard saved successfully/i)).toBeVisible(
        { timeout: MEDIUM_WAIT },
      );

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

      // Seed the bar chart from a constant query (same pattern as
      // save-to-dashboard.spec.ts's `SELECT 1 AS mocked_column`). This test
      // verifies the save -> render path, not dataset querying, so a literal
      // `VALUES` result keeps it deterministic: querying an uploaded dataset by
      // id over a full page reload races DuckDB registration (a fresh reload
      // starts an empty DuckDB and rehydrates a stale-empty workspace-datasets
      // list, which gates the on-demand registration in
      // `WorkspaceQetlClient.runQuery`).
      const sql =
        `SELECT * FROM (VALUES ('Riverside', 1800), ('Orange', 1600), ` +
        `('Kern', 900), ('Fresno', 700)) AS t("Admin2", "total_cases")`;
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
      await expect(page.locator(".recharts-bar").first()).toBeVisible({
        timeout: MEDIUM_WAIT,
      });

      // Step 5: Open Save -> Save to dashboard, pick the dashboard we made.
      // `deleteAllDashboardsForOwner` ran first, so this is the only dashboard
      // in the list; select it without depending on its (default) name.
      await page.getByRole("button", { name: /^save$/i }).click();
      await page.getByRole("menuitem", { name: /save to dashboard/i }).click();

      const listbox = page.getByRole("listbox", { name: /dashboards/i });
      await expect(listbox).toBeVisible({ timeout: SHORT_WAIT });
      await listbox.getByRole("option").first().click();

      await page.getByRole("button", { name: /^save to dashboard$/i }).click();

      // Toast confirms the save hit the database.
      await expect(page.getByText(/^Added to /)).toBeVisible({
        timeout: LONG_WAIT,
      });

      // Step 6 setup: open the dashboard editor directly by id. The DataViz
      // block was saved with a constant query, so it renders from a fresh page
      // load without any dataset/DuckDB state; a hard navigation is safe here
      // and avoids the flaky sidebar-link + card click on the reflowing Data
      // Explorer canvas.
      await page.goto(`/${workspaceSlug}/dashboards/edit/${dashboardId}`);

      await expect(page.getByLabel("loading")).toBeHidden({
        timeout: LONG_WAIT,
      });

      // Step 6: The DataViz block we appended should render inside the
      // Puck canvas iframe. If the block was saved without a usable
      // `nlQuery.prompt`, DataVizPBlock short-circuits to its "add a
      // prompt" placeholder and the bar chart never appears.
      await expect(async () => {
        const editorFrame = page.locator("iframe").first().contentFrame();
        await expect(editorFrame.locator(".recharts-bar").first()).toBeVisible({
          timeout: SHORT_WAIT,
        });
      }).toPass({ timeout: LONG_WAIT });
    } finally {
      await deleteDashboardsByIds({ admin, dashboardIds: createdDashboardIds });
    }
  });
});
