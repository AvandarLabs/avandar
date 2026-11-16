/*
 * The Mozambique pack, end to end: installing it through the wizard imports
 * its province and district boundaries as datasets, which the plugin's card
 * links to and Data Sources lists.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteDatasetFixture } from "./helpers/deleteDatasetFixture";
import { makeDatasetPageUrlPatternFromWorkspaceSlug } from "./helpers/manualUploadCloudSyncFlow";
import {
  getPluginCard,
  installPluginThroughWizard,
} from "./helpers/pluginFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { Locator, Page } from "@playwright/test";

const PLUGIN_ID = "avandar.mozambique";
const PLUGIN_NAME = "Mozambique";

/** Each content item's title, which also names the dataset it becomes. */
const DATASET_NAMES = ["Mozambique provinces", "Mozambique districts"];

/**
 * Waits on the Confirm step until every dataset of the pack is imported. It
 * throws the first `Failed: <reason>` status as soon as one shows, so a failed
 * import reports its reason instead of timing out.
 */
async function _expectEveryDatasetImported(wizard: Locator): Promise<void> {
  const failedStatuses = wizard.getByText(/^Failed:/);
  const importedStatuses = wizard.getByText("Imported", { exact: true });
  await expect
    .poll(
      async () => {
        if ((await failedStatuses.count()) > 0) {
          throw new Error(
            `A dataset import failed: ${await failedStatuses.first().innerText()}`,
          );
        }
        return importedStatuses.count();
      },
      {
        message: "Every dataset of the pack should show Imported",
        timeout: LONG_WAIT,
      },
    )
    .toBe(DATASET_NAMES.length);
}

/**
 * Deletes the datasets the pack imported into the workspace, found through
 * its import rows. Each dataset is deleted on its own, so one failure does
 * not leak the rest, and the failures are rethrown together. Deleting a
 * dataset deletes its import row with it (the composite foreign key
 * cascades), so no import row is deleted separately: a row that survives
 * means its dataset did too, and the row is how the next run finds it.
 */
async function _deleteImportedContent(
  options: Readonly<{ admin: AvaSupabaseDBClient; workspaceId: string }>,
): Promise<void> {
  const { admin, workspaceId } = options;
  const { data: imports } = await admin
    .from("plugin_content_imports")
    .select("dataset_id")
    .eq("workspace_id", workspaceId)
    .eq("plugin_id", PLUGIN_ID)
    .throwOnError();
  const results = await Promise.allSettled(
    imports.map((contentImport) => {
      return deleteDatasetFixture({
        admin,
        datasetId: contentImport.dataset_id,
        workspaceId,
      });
    }),
  );
  const failureMessages = results.flatMap((result, index) => {
    return result.status === "rejected"
      ? [`dataset ${imports[index]?.dataset_id}: ${String(result.reason)}`]
      : [];
  });
  if (failureMessages.length > 0) {
    throw new Error(
      `Could not delete ${failureMessages.length} imported dataset(s): ${failureMessages.join("; ")}`,
    );
  }
}

/** Checks that the plugin's card links each dataset to its page. */
async function _expectCardLinksEveryDataset(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<void> {
  const card = getPluginCard(options.page, PLUGIN_NAME);
  await expect(
    card.getByRole("heading", { name: "Datasets it includes" }),
  ).toBeVisible();
  for (const datasetName of DATASET_NAMES) {
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
  for (const datasetName of DATASET_NAMES) {
    await expect(page.getByRole("link", { name: datasetName })).toBeVisible({
      timeout: LONG_WAIT,
    });
  }
}

/** Deletes the plugin's install. */
async function _deletePluginInstallation(
  options: Readonly<{ admin: AvaSupabaseDBClient; workspaceId: string }>,
): Promise<void> {
  const { error } = await options.admin
    .from("plugin_installations")
    .delete()
    .eq("workspace_id", options.workspaceId)
    .eq("plugin_id", PLUGIN_ID);
  if (error) {
    console.warn(
      `[e2e] Mozambique plugin installation cleanup: ${error.message}`,
    );
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
        pluginName: PLUGIN_NAME,
        onInstallStarted: () => {
          didInstall = true;
        },
        beforeDone: _expectEveryDatasetImported,
      });
      await _expectCardLinksEveryDataset({ page, workspaceSlug });
      await _expectDataSourcesListsEveryDataset(page);
    } finally {
      // Each cleanup step runs even when an earlier one fails.
      await _deleteImportedContent({ admin, workspaceId }).catch(
        (error: unknown) => {
          console.warn(`[e2e] Mozambique content cleanup: ${String(error)}`);
        },
      );
      if (didInstall) {
        await _deletePluginInstallation({ admin, workspaceId });
      }
    }
  });
});
