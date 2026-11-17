import { promiseMapSequential } from "@avandar/utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { UserClient } from "@/clients/UserClient";
import { Logger } from "@/utils/Logger";
import { UninstallPluginError } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/UninstallPluginError";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

/** What an uninstall left behind: the chosen datasets it could not delete. */
export type UninstallOutcome = {
  failedDatasetIds: Dataset.Id[];
};

/**
 * Deletes the install and proves it is gone. The CRUD client's delete does
 * not report how many rows it removed, so a delete that RLS refuses would
 * otherwise look like a success.
 */
async function _deleteInstallationOrThrow(
  installationId: PluginInstallation.Id,
): Promise<void> {
  await PluginInstallationClient.delete({ id: installationId });
  const remaining = await PluginInstallationClient.getById({
    id: installationId,
  });
  if (remaining !== undefined) {
    throw new UninstallPluginError({
      installationId,
      reason: "still_installed",
    });
  }
}

/**
 * Deletes one dataset if the user may still delete it, and says whether it
 * was deleted. A dataset that cannot be deleted, or whose delete throws, is
 * reported as not deleted instead of throwing.
 */
async function _deleteDatasetIfAllowed(
  datasetId: Dataset.Id,
): Promise<boolean> {
  try {
    // Check access first: `fullDelete` removes the dataset's files before its
    // row, so a row that RLS refuses to delete would be left with no data.
    const canDelete = await UserClient.canAccessResource({
      resourceType: "dataset",
      resourceId: datasetId,
      minRole: "admin",
    });
    if (!canDelete) {
      return false;
    }
    await DatasetClient.fullDelete({ id: datasetId });
    return true;
  } catch (error) {
    Logger.error("Could not delete a dataset while uninstalling a plugin", {
      datasetId,
      error,
    });
    return false;
  }
}

/**
 * Uninstalls a plugin, then deletes the datasets the admin chose, one at a
 * time in the order given. Use it where an admin confirms an uninstall that
 * may also delete what the plugin imported, such as the uninstall dialog on
 * a plugin's card. It returns the datasets it could not delete, so the
 * caller can tell the admin they are still in Data Sources.
 *
 * Nothing is deleted unless the install is gone. A dataset that cannot be
 * deleted does not stop the others.
 */
export async function uninstallPluginAndDeleteDatasets(
  options: Readonly<{
    installationId: PluginInstallation.Id;
    datasetIds: readonly Dataset.Id[];
  }>,
): Promise<UninstallOutcome> {
  await _deleteInstallationOrThrow(options.installationId);
  const results = await promiseMapSequential(
    options.datasetIds,
    async (datasetId) => {
      return {
        datasetId,
        isDeleted: await _deleteDatasetIfAllowed(datasetId),
      };
    },
  );
  return {
    failedDatasetIds: results
      .filter((result) => {
        return !result.isDeleted;
      })
      .map((result) => {
        return result.datasetId;
      }),
  };
}
