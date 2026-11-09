import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  dismissBlockingOverlays,
  openDataExplorerDrawerTab,
} from "./helpers/dataExplorerFlow";
import { parseDashboardIdFromEditorUrl } from "./helpers/parseDashboardIdFromEditorUrl";
import {
  deleteAllDashboardsForOwner,
  deleteDashboardsByIds,
} from "./helpers/seedDashboard";
import { openShareModal } from "./helpers/shareModalFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import { installDuckDbExtensionCache } from "./setup/installDuckDbExtensionCache";
import { stubFeaturebaseSdk } from "./setup/stubFeaturebaseSdk";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type {
  Browser,
  BrowserContext,
  FrameLocator,
  Locator,
  Page,
} from "@playwright/test";

/**
 * Twenty-one consecutive onset dates from Monday 2024-01-01. They fall in four
 * MMWR weeks, starting 2023-12-31 (6 dates), 2024-01-07 (7), 2024-01-14 (7),
 * and 2024-01-21 (1), so the default epi-week epicurve draws four bars.
 */
const ONSET_SQL =
  "SELECT DATE '2024-01-01' + CAST(day_offset AS INTEGER) AS onset_date " +
  "FROM range(0, 21) AS t(day_offset)";
const EPICURVE_BAR_COUNT = 4;
const PLUGIN_ID = "avandar.epidemiology";

function _getPluginCard(page: Page): Locator {
  return page.getByRole("region", { name: "Epidemiology" });
}

/** The bars a Recharts bar chart draws, on a page or in the editor canvas. */
function _getBars(scope: Page | FrameLocator): Locator {
  return scope.locator(".recharts-bar-rectangle path");
}

async function _installPlugin(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<void> {
  const { page, workspaceSlug } = options;
  await page.goto(`/${workspaceSlug}/settings/plugins`);
  const card = _getPluginCard(page);
  await expect(card.getByText("Not installed", { exact: true })).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  await card.getByRole("button", { name: "Install", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Install Epidemiology?" })
    .getByRole("button", { name: "Install", exact: true })
    .click();
  await expect(card.getByText("Installed", { exact: true })).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
}

/** Runs the onset query in the Data Explorer and picks the epicurve. */
async function _pickEpicurve(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<void> {
  const { page, workspaceSlug } = options;
  // The `?sql=` deep link stands in for typing the query: the editor is not
  // what this spec covers, and the epicurve picker is still driven by clicks.
  await page.goto(
    `/${workspaceSlug}/data-explorer?sql=${encodeURIComponent(ONSET_SQL)}`,
  );
  await dismissBlockingOverlays(page);
  await expect(
    page.getByRole("columnheader", { name: "onset_date" }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
  await openDataExplorerDrawerTab({ page, tab: "visualizations" });
  const vizTypeSelect = page.getByRole("combobox", {
    name: /visualization type/i,
  });
  await vizTypeSelect.click();
  await page
    .getByRole("option", { name: "Epicurve", exact: true })
    .click({ timeout: MEDIUM_WAIT });
  await expect(vizTypeSelect).toHaveValue("Epicurve", { timeout: SHORT_WAIT });
}

/**
 * Saves the chart on screen to a new dashboard, then opens that dashboard's
 * editor from the confirmation.
 *
 * @returns The new dashboard's id, read from the editor's URL.
 */
async function _saveToNewDashboard(
  options: Readonly<{ page: Page; dashboardName: string }>,
): Promise<string> {
  const { page, dashboardName } = options;
  await page.getByRole("button", { name: /^save$/i }).click();
  await page.getByRole("menuitem", { name: /save to dashboard/i }).click();
  await page.getByLabel(/dashboard name/i).fill(dashboardName);
  await page.getByRole("button", { name: /create dashboard & save/i }).click();
  await expect(page.getByText(`Created "${dashboardName}"`)).toBeVisible({
    timeout: LONG_WAIT,
  });
  await page.getByText("Open dashboard", { exact: true }).click();
  await expect(page).toHaveURL(/\/dashboards\/edit\/[0-9a-f-]{36}/i, {
    timeout: LONG_WAIT,
  });
  const dashboardId = parseDashboardIdFromEditorUrl(page.url());
  if (dashboardId === undefined) {
    throw new Error(`Could not parse a dashboard id from ${page.url()}`);
  }
  return dashboardId;
}

/**
 * Publishes the open dashboard to the web through the share modal. Saves
 * first, because publishing copies the saved config and the modal refuses to
 * publish while the editor holds unsaved changes.
 */
async function _publishPublicly(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page.getByText(/dashboard saved successfully/i)).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  await openShareModal(page);
  const dialog = page.getByRole("dialog", { name: /^Share / });
  await dialog.getByRole("combobox", { name: "General access" }).click();
  await page.getByRole("option", { name: "Anyone with the link" }).click();
  await dialog.getByRole("button", { name: "Publish publicly" }).click();
  await expect(dialog).toContainText("This dashboard is public.", {
    timeout: LONG_WAIT,
  });
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden({ timeout: MEDIUM_WAIT });
}

/**
 * A browser context with no session, as a visitor following a shared link
 * has. It gets the same DuckDB extension cache and Featurebase stub every
 * spec's own context gets.
 */
async function _openVisitorContext(
  options: Readonly<{ browser: Browser; baseURL: string | undefined }>,
): Promise<BrowserContext> {
  const context = await options.browser.newContext({
    baseURL: options.baseURL,
    reducedMotion: "reduce",
  });
  await installDuckDbExtensionCache(context);
  await stubFeaturebaseSdk(context);
  return context;
}

/**
 * Deletes the dashboards this spec created, found by their unique name, with
 * every share row pointing at them, which unpublishes them. Their query reads
 * no dataset, so publishing uploaded no snapshot files to remove.
 */
async function _deleteDashboardsNamed(
  options: Readonly<{
    admin: AvaSupabaseDBClient;
    workspaceId: string;
    dashboardName: string;
  }>,
): Promise<void> {
  const { admin, workspaceId, dashboardName } = options;
  const { data: dashboards } = await admin
    .from("dashboards")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", dashboardName);
  const dashboardIds = (dashboards ?? []).map((dashboard) => {
    return dashboard.id;
  });
  if (dashboardIds.length === 0) {
    return;
  }
  const { error } = await admin
    .from("resource_shares")
    .delete()
    .eq("resource_type", "dashboard")
    .in("resource_id", dashboardIds);
  if (error) {
    console.warn(`[e2e] epicurve dashboard share cleanup: ${error.message}`);
  }
  await deleteDashboardsByIds({ admin, dashboardIds });
}

test.describe("Epidemiology plugin epicurve", () => {
  test("an epicurve saved from the Data Explorer renders on the dashboard's public link", async ({
    page,
    browser,
    baseURL,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    const dashboardName = `E2E epicurve ${crypto.randomUUID().slice(0, 8)}`;
    let visitorContext: BrowserContext | undefined;
    // "Save to dashboard" opens on its create form only for a user with no
    // dashboards, and the free plan allows one shareable dashboard.
    await deleteAllDashboardsForOwner({
      admin,
      workspaceId,
      ownerEmail: primaryUser.email,
    });
    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await _installPlugin({ page, workspaceSlug });
      await _pickEpicurve({ page, workspaceSlug });
      await expect(_getBars(page)).toHaveCount(EPICURVE_BAR_COUNT, {
        timeout: MEDIUM_WAIT,
      });

      const dashboardId = await _saveToNewDashboard({ page, dashboardName });
      const editorFrame = page.locator("iframe").first().contentFrame();
      await expect(_getBars(editorFrame)).toHaveCount(EPICURVE_BAR_COUNT, {
        timeout: LONG_WAIT,
      });
      await _publishPublicly(page);

      visitorContext = await _openVisitorContext({ browser, baseURL });
      const visitorPage = await visitorContext.newPage();
      await visitorPage.goto(`/d/${dashboardId}`, {
        waitUntil: "domcontentloaded",
      });
      await expect(_getBars(visitorPage)).toHaveCount(EPICURVE_BAR_COUNT, {
        timeout: LONG_WAIT,
      });
    } finally {
      // Each cleanup step runs even when an earlier one fails.
      await visitorContext?.close().catch(() => {});
      await _deleteDashboardsNamed({
        admin,
        workspaceId,
        dashboardName,
      }).catch((error: unknown) => {
        console.warn(`[e2e] epicurve dashboard cleanup: ${String(error)}`);
      });
      // Removes only the install this spec made through Settings.
      const { error: installationError } = await admin
        .from("plugin_installations")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("plugin_id", PLUGIN_ID);
      if (installationError) {
        console.warn(
          `[e2e] epicurve plugin installation cleanup: ${installationError.message}`,
        );
      }
    }
  });
});
