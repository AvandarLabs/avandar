import { expect } from "@playwright/test";
import { deleteDatasetFixture } from "./deleteDatasetFixture";
import { LONG_WAIT } from "./timeouts";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { Locator } from "@playwright/test";

/** The Mozambique pack's plugin id. */
export const MOZAMBIQUE_PLUGIN_ID = "avandar.mozambique";

/** The Mozambique pack's name, as its settings card and wizard show it. */
export const MOZAMBIQUE_PLUGIN_NAME = "Mozambique";

/** Each content item's title, which also names the dataset it becomes. */
export const MOZAMBIQUE_DATASET_NAMES = [
  "Mozambique provinces",
  "Mozambique districts",
];

/**
 * Waits on the Confirm step until every dataset of the pack is imported. It
 * throws the first `Failed: <reason>` status as soon as one shows, so a failed
 * import reports its reason instead of timing out.
 */
export async function expectEveryMozambiqueDatasetImported(
  wizard: Locator,
): Promise<void> {
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
    .toBe(MOZAMBIQUE_DATASET_NAMES.length);
}

/**
 * Deletes the datasets the pack imported into the workspace, found through
 * its import rows. Each dataset is deleted on its own, so one failure does
 * not leak the rest, and the failures are rethrown together. Deleting a
 * dataset deletes its import row with it (the composite foreign key
 * cascades), so no import row is deleted separately: a row that survives
 * means its dataset did too, and the row is how the next run finds it.
 */
export async function deleteMozambiqueImportedContent(
  options: Readonly<{ admin: AvaSupabaseDBClient; workspaceId: string }>,
): Promise<void> {
  const { admin, workspaceId } = options;
  const { data: imports } = await admin
    .from("plugin_content_imports")
    .select("dataset_id")
    .eq("workspace_id", workspaceId)
    .eq("plugin_id", MOZAMBIQUE_PLUGIN_ID)
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

/** Deletes the plugin's install. */
export async function deleteMozambiquePluginInstallation(
  options: Readonly<{ admin: AvaSupabaseDBClient; workspaceId: string }>,
): Promise<void> {
  const { error } = await options.admin
    .from("plugin_installations")
    .delete()
    .eq("workspace_id", options.workspaceId)
    .eq("plugin_id", MOZAMBIQUE_PLUGIN_ID);
  if (error) {
    console.warn(
      `[e2e] Mozambique plugin installation cleanup: ${error.message}`,
    );
  }
}
