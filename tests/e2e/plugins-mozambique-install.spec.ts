/*
 * The Mozambique pack, end to end: installing it through the wizard imports
 * its province and district boundaries as datasets, which the plugin's card
 * links to and Data Sources lists.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { makeDatasetPageUrlPatternFromWorkspaceSlug } from "./helpers/manualUploadCloudSyncFlow";
import {
  deleteMozambiqueImportedContent,
  deleteMozambiquePluginInstallation,
  expectEveryMozambiqueDatasetImported,
  MOZAMBIQUE_DATASET_NAMES,
  MOZAMBIQUE_PLUGIN_NAME,
} from "./helpers/mozambiquePackFlow";
import {
  getPluginCard,
  installPluginThroughWizard,
} from "./helpers/pluginFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";

/** Checks that the plugin's card links each dataset to its page. */
async function _expectCardLinksEveryDataset(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<void> {
  const card = getPluginCard(options.page, MOZAMBIQUE_PLUGIN_NAME);
  await expect(
    card.getByRole("heading", { name: "Datasets it includes" }),
  ).toBeVisible();
  for (const datasetName of MOZAMBIQUE_DATASET_NAMES) {
    await expect(
      card.getByRole("link", { name: datasetName, exact: true }),
    ).toHaveAttribute(
      "href",
      makeDatasetPageUrlPatternFromWorkspaceSlug(options.workspaceSlug),
      { timeout: MEDIUM_WAIT },
    );
  }
}

/**
 * Opens Data Sources from the nav and checks that it lists each dataset.
 * It goes client-side, as a user would, because a reload could restore a
 * dataset list cached before the import. A dataset's row may also carry an
 * Offline badge, so its link is matched by the name it contains.
 */
async function _expectDataSourcesListsEveryDataset(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Data Sources", exact: true }).click();
  for (const datasetName of MOZAMBIQUE_DATASET_NAMES) {
    await expect(page.getByRole("link", { name: datasetName })).toBeVisible({
      timeout: LONG_WAIT,
    });
  }
}

test.describe("Mozambique plugin", () => {
  test("installing it imports its provinces and districts as datasets its card links to", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    // Set once Install is clicked in the install wizard, so cleanup never
    // deletes an install this spec did not make.
    let didInstall = false;
    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      // Both datasets start checked on the wizard's Datasets step, and the
      // helper leaves them that way.
      await installPluginThroughWizard(page, {
        workspaceSlug,
        pluginName: MOZAMBIQUE_PLUGIN_NAME,
        onInstallStarted: () => {
          didInstall = true;
        },
        beforeDone: expectEveryMozambiqueDatasetImported,
      });
      await _expectCardLinksEveryDataset({ page, workspaceSlug });
      await _expectDataSourcesListsEveryDataset(page);
    } finally {
      // Each cleanup step runs even when an earlier one fails.
      await deleteMozambiqueImportedContent({ admin, workspaceId }).catch(
        (error: unknown) => {
          console.warn(`[e2e] Mozambique content cleanup: ${String(error)}`);
        },
      );
      if (didInstall) {
        await deleteMozambiquePluginInstallation({ admin, workspaceId });
      }
    }
  });
});
