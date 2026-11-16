import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  dismissBlockingOverlays,
  openDataExplorerDrawerTab,
} from "./helpers/dataExplorerFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import type { Locator, Page } from "@playwright/test";

/**
 * Case counts and 2020 census populations for New York City's five boroughs.
 * Every population is above zero, so every row gets both interval bounds and
 * the rate plot draws one whisker per borough.
 */
const BOROUGH_SQL =
  "SELECT * FROM (VALUES " +
  "('Bronx', 120, 1472654), " +
  "('Brooklyn', 240, 2736074), " +
  "('Manhattan', 90, 1694251), " +
  "('Queens', 150, 2405464), " +
  "('Staten Island', 15, 495747)" +
  ") AS t(borough, cases, population)";
const BOROUGH_COUNT = 5;
const RATE_COLUMN = "incidence_per_100k";
const PLUGIN_ID = "avandar.epidemiology";

function _getPluginCard(page: Page): Locator {
  return page.getByRole("region", { name: "Epidemiology" });
}

function _getColumnHeader(
  options: Readonly<{ page: Page; columnName: string }>,
): Locator {
  return options.page.getByRole("columnheader", {
    name: options.columnName,
    exact: true,
  });
}

/**
 * Installs the plugin from Settings. Calls `onInstallConfirmed` as soon as
 * the install is confirmed, before waiting for "Installed", so a caller can
 * clean up an install whose card never updates.
 */
async function _installPlugin(
  options: Readonly<{
    page: Page;
    workspaceSlug: string;
    onInstallConfirmed: () => void;
  }>,
): Promise<void> {
  const { page, workspaceSlug, onInstallConfirmed } = options;
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
  onInstallConfirmed();
  await expect(card.getByText("Installed", { exact: true })).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
}

/**
 * Runs "Incidence per 100k" from the toolbar with the modal's defaults:
 * `cases` over `population`, per 100,000. Returns the notification that
 * lists the added columns.
 */
async function _addIncidenceColumns(page: Page): Promise<Locator> {
  await page
    .getByRole("button", { name: "Incidence per 100k" })
    .click({ timeout: MEDIUM_WAIT });
  const dialog = page.getByRole("dialog", { name: "Incidence per 100k" });
  await dialog.getByRole("button", { name: "Add columns" }).click();
  await expect(dialog).toBeHidden({ timeout: SHORT_WAIT });
  await expect(
    _getColumnHeader({ page, columnName: `${RATE_COLUMN}_upper` }),
  ).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  const notification = page
    .getByRole("alert")
    .filter({ hasText: "Columns added" });
  await expect(notification).toContainText(`${RATE_COLUMN}_upper`);
  return notification;
}

/** Picks a result column in one of the chart settings' column pickers. */
async function _pickColumn(
  options: Readonly<{ page: Page; settingLabel: string; columnName: string }>,
): Promise<void> {
  const { page, settingLabel, columnName } = options;
  await page.getByRole("combobox", { name: settingLabel }).click();
  await page.getByRole("option", { name: columnName, exact: true }).click();
}

/** Switches the chart to the rate plot and binds the incidence columns. */
async function _drawRatePlot(page: Page): Promise<void> {
  await openDataExplorerDrawerTab({ page, tab: "visualizations" });
  const vizTypeSelect = page.getByRole("combobox", {
    name: /visualization type/i,
  });
  await vizTypeSelect.click();
  await page
    .getByRole("option", { name: "Rate plot", exact: true })
    .click({ timeout: MEDIUM_WAIT });
  await expect(vizTypeSelect).toHaveValue("Rate plot", { timeout: SHORT_WAIT });
  // Picking the chart type fills the required label column with `borough`.
  await _pickColumn({
    page,
    settingLabel: "Rate column",
    columnName: RATE_COLUMN,
  });
  await _pickColumn({
    page,
    settingLabel: "Lower bound column",
    columnName: `${RATE_COLUMN}_lower`,
  });
  await _pickColumn({
    page,
    settingLabel: "Upper bound column",
    columnName: `${RATE_COLUMN}_upper`,
  });
}

test.describe("Epidemiology plugin incidence", () => {
  test("incidence columns from the toolbar draw a rate plot with a whisker per borough", async ({
    page,
    e2eWorkerDb,
  }) => {
    const supabaseAdminClient = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient,
      slug: workspaceSlug,
    });
    // Set once the Settings install is confirmed, so cleanup never deletes
    // an install this spec did not make.
    let didInstall = false;
    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await _installPlugin({
        page,
        workspaceSlug,
        onInstallConfirmed: () => {
          didInstall = true;
        },
      });
      // The `?sql=` deep link stands in for typing the query: the editor is
      // not what this spec covers, and the command is still driven by clicks.
      await page.goto(
        `/${workspaceSlug}/data-explorer?sql=${encodeURIComponent(BOROUGH_SQL)}`,
      );
      await dismissBlockingOverlays(page);
      await expect(
        _getColumnHeader({ page, columnName: "population" }),
      ).toBeVisible({
        timeout: MEDIUM_WAIT,
      });

      const firstNotification = await _addIncidenceColumns(page);
      await expect(
        _getColumnHeader({ page, columnName: RATE_COLUMN }),
      ).toBeVisible();
      await expect(
        _getColumnHeader({ page, columnName: `${RATE_COLUMN}_lower` }),
      ).toBeVisible();
      await firstNotification.getByRole("button", { name: "Undo" }).click();
      await expect(
        _getColumnHeader({ page, columnName: RATE_COLUMN }),
      ).toHaveCount(0, {
        timeout: MEDIUM_WAIT,
      });
      await expect(
        _getColumnHeader({ page, columnName: "population" }),
      ).toBeVisible();

      await _addIncidenceColumns(page);
      await _drawRatePlot(page);
      await expect(page.locator(".recharts-errorBar")).toHaveCount(
        BOROUGH_COUNT,
        { timeout: MEDIUM_WAIT },
      );
    } finally {
      // Removes only the install this spec made through Settings.
      if (didInstall) {
        await supabaseAdminClient
          .from("plugin_installations")
          .delete()
          .eq("workspace_id", workspaceId)
          .eq("plugin_id", PLUGIN_ID);
      }
    }
  });
});
