import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { dismissBlockingOverlays } from "./helpers/dataExplorerFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT } from "./helpers/timeouts";
import type { Locator, Page } from "@playwright/test";

/** Twenty points on the exact line y = 2x + 1, so every statistic is known. */
const REGRESSION_SQL = "SELECT x, 2 * x + 1 AS y FROM range(1, 21) t(x)";
const PLUGIN_ID = "avandar.epidemiology";

async function _confirmDialog(page: Page, buttonName: string): Promise<void> {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: buttonName })
    .click();
}

function _getPluginCard(page: Page): Locator {
  return page.getByRole("region", { name: "Epidemiology" });
}

/**
 * Asserts one regression statistic. A statistic is a labelled group holding
 * its label and its value, so the whole text is checked, not a substring.
 */
async function _expectStatistic(options: {
  dialog: Locator;
  label: string;
  value: string;
}): Promise<void> {
  const { dialog, label, value } = options;
  await expect(dialog.getByRole("group", { name: label })).toHaveText(
    `${label}${value}`,
  );
}

test.describe("Epidemiology plugin", () => {
  test("an admin installs it and fits a regression from Data Explorer", async ({
    page,
    e2eWorkerDb,
  }) => {
    const supabaseAdminClient = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient,
      slug: workspaceSlug,
    });
    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      await page.goto(`/${workspaceSlug}/settings/plugins`);
      const card = _getPluginCard(page);
      await expect(
        card.getByText("Not installed", { exact: true }),
      ).toBeVisible({ timeout: MEDIUM_WAIT });
      await card.getByRole("button", { name: "Install" }).click();
      await _confirmDialog(page, "Install");
      await expect(card.getByText("Installed", { exact: true })).toBeVisible({
        timeout: MEDIUM_WAIT,
      });

      await page.goto(
        `/${workspaceSlug}/data-explorer?sql=${encodeURIComponent(REGRESSION_SQL)}`,
      );
      await dismissBlockingOverlays(page);
      await expect(
        page.getByRole("columnheader", { name: /^y$/i }),
      ).toBeVisible({ timeout: MEDIUM_WAIT });

      await page
        .getByRole("button", { name: "Linear regression" })
        .click({ timeout: MEDIUM_WAIT });
      const dialog = page.getByRole("dialog", { name: "Linear regression" });
      await dialog.getByRole("button", { name: "Fit regression" }).click();
      await _expectStatistic({ dialog, label: "Slope", value: "2" });
      await _expectStatistic({ dialog, label: "Intercept", value: "1" });
      await _expectStatistic({ dialog, label: "R²", value: "1" });
      await _expectStatistic({ dialog, label: "Rows used", value: "20" });
      await page.keyboard.press("Escape");

      await page.goto(`/${workspaceSlug}/settings/plugins`);
      await _getPluginCard(page)
        .getByRole("button", { name: "Uninstall" })
        .click();
      await _confirmDialog(page, "Uninstall");
      await expect(
        _getPluginCard(page).getByText("Not installed", { exact: true }),
      ).toBeVisible({ timeout: MEDIUM_WAIT });
    } finally {
      // Safety net if the test failed before its own UI uninstall. Removes
      // only the row this test may have created.
      await supabaseAdminClient
        .from("plugin_installations")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("plugin_id", PLUGIN_ID);
    }
  });
});
