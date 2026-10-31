import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { openDataExplorerDrawerTab } from "./helpers/dataExplorerFlow";
import { deleteDashboardsByIds } from "./helpers/seedDashboard";
import { createSupabaseAdminClient } from "./helpers/supabaseAdminClient";
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
 *   5. Reopen the persisted dashboard in the editor.
 *   6. Assert the chart and styling inside the Puck canvas iframe.
 *   7. Open View and verify tooltip values in the saved preview.
 */
test.describe("Data Explorer: save viz to dashboard", () => {
  test("bar chart saved to an existing dashboard renders inside that dashboard's editor", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const dashboardName = `Binding reopen ${crypto.randomUUID()}`;

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

      await page
        .getByRole("textbox", { name: "Page title", exact: true })
        .fill(dashboardName);

      // Save the uniquely named dashboard through the editor.
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
      // `WorkspaceQuerySession.runQuery`).
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
      // columns, so we don't need to fill the axis subform.
      //
      // The select lives in the drawer's tab rail, which renders it only while
      // the drawer is open on the Visualizations tab, so open that tab first.
      await openDataExplorerDrawerTab({ page, tab: "visualizations" });

      const vizTypeSelect = page.getByRole("combobox", {
        name: /visualization type/i,
      });
      await vizTypeSelect.click();
      await page.getByRole("option", { name: /^bar chart$/i }).click();

      // Settle on the picker echoing the choice before waiting on the chart, so
      // a click Mantine swallowed is reported as such instead of as a chart
      // that never rendered.
      await expect(vizTypeSelect).toHaveValue(/^bar chart$/i, {
        timeout: SHORT_WAIT,
      });
      await expect(page.locator(".recharts-bar").first()).toBeVisible({
        timeout: MEDIUM_WAIT,
      });

      await page
        .getByRole("textbox", { name: "Series label", exact: true })
        .fill("Revenue trend");
      await page
        .getByRole("textbox", { name: "Color", exact: true })
        .fill("#123456");
      await page
        .getByRole("textbox", { name: "Color", exact: true })
        .press("Tab");
      await expect(
        page.locator(".recharts-bar-rectangle path").first(),
      ).toHaveAttribute("fill", "#123456");

      // Select only the dashboard created by this test.
      await page.getByRole("button", { name: /^save$/i }).click();
      await page.getByRole("menuitem", { name: /save to dashboard/i }).click();

      const listbox = page.getByRole("listbox", { name: /dashboards/i });
      await expect(listbox).toBeVisible({ timeout: SHORT_WAIT });
      await listbox
        .getByRole("option")
        .filter({ hasText: dashboardName })
        .click();

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
      const editorFrame = page.locator("iframe").first().contentFrame();
      const bars = editorFrame.locator(".recharts-bar-rectangle path");
      await expect(bars).toHaveCount(4, { timeout: LONG_WAIT });
      await expect(bars.first()).toHaveAttribute("fill", "#123456");
      await expect(
        editorFrame.getByText("Revenue trend", { exact: true }).first(),
      ).toBeVisible();
      await page.screenshot({
        path: ".temp/refactor-query-column-id/save-reopen-bindings.png",
        fullPage: true,
      });

      // The editor's selection overlay owns pointer interactions. View opens
      // the persisted dashboard with interactive chart tooltips.
      await page.getByRole("button", { name: "View", exact: true }).click();
      await expect(page).toHaveURL(
        new RegExp(`/${workspaceSlug}/dashboards/preview/${dashboardId}`),
        { timeout: MEDIUM_WAIT },
      );
      const previewBars = page.locator(".recharts-bar-rectangle path");
      await expect(previewBars).toHaveCount(4, { timeout: MEDIUM_WAIT });
      await expect(previewBars.first()).toHaveAttribute("fill", "#123456");
      await expect(
        page.getByText("Revenue trend", { exact: true }).first(),
      ).toBeVisible();
      await previewBars.first().hover();
      const tooltip = page.locator(".recharts-tooltip-wrapper");
      await expect(tooltip).toContainText("Riverside");
      await expect(tooltip).toContainText(/1,?800/);
      await previewBars.last().hover();
      await expect(tooltip).toContainText("Fresno");
      await expect(tooltip).toContainText("700");
      await page.screenshot({
        path: ".temp/refactor-query-column-id/save-reopen-preview-bindings.png",
        fullPage: true,
      });
    } finally {
      await deleteDashboardsByIds({ admin, dashboardIds: createdDashboardIds });
    }
  });
});
