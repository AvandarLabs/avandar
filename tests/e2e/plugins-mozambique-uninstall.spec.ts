/*
 * Uninstalling the Mozambique pack lets an admin delete some of the
 * datasets it imported: the chosen one leaves Data Sources and the other
 * stays.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  deleteMozambiqueImportedContent,
  deleteMozambiquePluginInstallation,
  expectEveryMozambiqueDatasetImported,
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
import { LONG_WAIT } from "./helpers/timeouts";

const KEPT_DATASET = "Mozambique provinces";
const DELETED_DATASET = "Mozambique districts";

test.describe("Mozambique plugin uninstall", () => {
  test("uninstalling it deletes only the imported datasets the admin chose", async ({
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
      await installPluginThroughWizard(page, {
        workspaceSlug,
        pluginName: MOZAMBIQUE_PLUGIN_NAME,
        onInstallStarted: () => {
          didInstall = true;
        },
        beforeDone: expectEveryMozambiqueDatasetImported,
      });

      const card = getPluginCard(page, MOZAMBIQUE_PLUGIN_NAME);
      await card
        .getByRole("button", { name: "Uninstall", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: `Uninstall ${MOZAMBIQUE_PLUGIN_NAME}?`,
        exact: true,
      });
      await dialog
        .getByRole("checkbox", { name: `Delete ${DELETED_DATASET}` })
        .check();
      await dialog
        .getByRole("button", { name: "Uninstall and delete 1 dataset" })
        .click();
      await expect(dialog).toBeHidden({ timeout: LONG_WAIT });
      await expect(
        card.getByRole("button", { name: "Install", exact: true }),
      ).toBeVisible();

      // Client-side, as a user would: a reload could restore a dataset list
      // cached before the delete.
      await page
        .getByRole("link", { name: "Data Sources", exact: true })
        .click();
      await expect(page.getByRole("link", { name: KEPT_DATASET })).toBeVisible({
        timeout: LONG_WAIT,
      });
      await expect(
        page.getByRole("link", { name: DELETED_DATASET }),
      ).toHaveCount(0);
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
