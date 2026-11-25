import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { dismissBlockingOverlays } from "./helpers/dataExplorerFlow";
import {
  getPluginCard,
  installPluginThroughWizard,
  runPluginCommand,
} from "./helpers/pluginFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT } from "./helpers/timeouts";
import type { Locator, Page } from "@playwright/test";

/** Twenty points on the exact line y = 2x + 1, so every statistic is known. */
const REGRESSION_SQL = "SELECT x, 2 * x + 1 AS y FROM range(1, 21) t(x)";
const PLUGIN_ID = "avandar.epidemiology";
const PLUGIN_NAME = "Epidemiology";

async function _confirmDialog(page: Page, buttonName: string): Promise<void> {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: buttonName })
    .click();
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

      await installPluginThroughWizard(page, {
        workspaceSlug,
        pluginName: PLUGIN_NAME,
      });

      await page.goto(
        `/${workspaceSlug}/data-explorer?sql=${encodeURIComponent(REGRESSION_SQL)}`,
      );
      await dismissBlockingOverlays(page);
      await expect(
        page.getByRole("columnheader", { name: /^y$/i }),
      ).toBeVisible({ timeout: MEDIUM_WAIT });

      await runPluginCommand(page, "Linear regression");
      const dialog = page.getByRole("dialog", { name: "Linear regression" });
      await dialog.getByRole("button", { name: "Fit regression" }).click();
      await _expectStatistic({ dialog, label: "Slope", value: "2" });
      await _expectStatistic({ dialog, label: "Intercept", value: "1" });
      await _expectStatistic({ dialog, label: "R²", value: "1" });
      await _expectStatistic({ dialog, label: "Rows used", value: "20" });
      await page.keyboard.press("Escape");

      await page.goto(`/${workspaceSlug}/settings/plugins`);
      const card = getPluginCard(page, PLUGIN_NAME);
      await card.getByRole("button", { name: "Uninstall" }).click();
      await _confirmDialog(page, "Uninstall");
      await expect(
        card.getByText("Not installed", { exact: true }),
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
