import { promiseMapSequential } from "@avandar/utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetDeleteError } from "@/clients/datasets/DatasetClient/DatasetDeleteError";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { Logger } from "@/utils/Logger";
import { UninstallPluginError } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/UninstallPluginError";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

/**
 * What an uninstall did to the datasets the admin chose. A dataset that was
 * already gone before the delete is in none of the lists.
 */
export type UninstallOutcome = {
  /** The datasets this uninstall deleted. */
  deletedDatasetIds: Dataset.Id[];

  /**
   * The datasets the user may not delete. Nothing of them was touched, so
   * they are all still in Data Sources.
   */
  refusedDatasetIds: Dataset.Id[];

  /**
   * The datasets whose state is unknown after a failure. Most failed after
   * the delete could have started, so their files and their row may already
   * be gone. One that could not even be read first was not touched. None of
   * them can be assumed to be intact in Data Sources, so the admin should
   * check each one.
   */
  incompleteDatasetIds: Dataset.Id[];
};

/** How deleting one dataset ended. */
type DatasetResult = "deleted" | "already_gone" | "refused" | "incomplete";

/**
 * Deletes the install and proves it is gone, or throws an
 * `UninstallPluginError`. The CRUD client's delete does not report how many
 * rows it removed, so a delete that RLS refuses would otherwise look like a
 * success, and the install is read back. A read that throws is `not_confirmed`
 * since the install may be gone. An install still there is `still_installed`.
 *
 * On the web the read-back runs against Supabase under the user's own access,
 * so it shows whether the server removed the row. On desktop it does not
 * prove that. `plugin_installations` is not mirrored to the desktop SQLite
 * database (see `EXCLUDED_TABLES`), so the CRUD client targets a local table
 * that does not exist and its delete throws before any dataset is touched.
 * Were the table ever mirrored, the read-back would see only the local copy
 * and not whether the server accepted the delete.
 */
async function _deleteInstallationOrThrow(
  installationId: PluginInstallation.Id,
): Promise<void> {
  await PluginInstallationClient.delete({ id: installationId });
  let remaining: PluginInstallation.T | undefined;
  try {
    remaining = await PluginInstallationClient.getById({ id: installationId });
  } catch (cause) {
    throw new UninstallPluginError({
      installationId,
      reason: "not_confirmed",
      cause,
    });
  }
  if (remaining !== undefined) {
    throw new UninstallPluginError({
      installationId,
      reason: "still_installed",
    });
  }
}

/**
 * Decides how a dataset ended after `fullDelete` threw. A refusal for lack of
 * admin access is `refused`: `fullDelete` checks access before it touches
 * anything, so it is not logged. Any other error is logged. `fullDelete`
 * removes the files before the row, so a dataset that did not end up deleted
 * is `incomplete`, never assumed intact. A `still_present` error already shows
 * the row survived. For any other error the dataset is read again, since
 * `fullDelete` can throw after it has deleted the row, for example while it
 * cleans up local copies, and then the dataset is gone.
 */
async function _settleAfterFailedDelete(
  options: Readonly<{ datasetId: Dataset.Id; error: unknown }>,
): Promise<DatasetResult> {
  const { datasetId, error } = options;
  if (error instanceof DatasetDeleteError && error.reason === "not_allowed") {
    return "refused";
  }
  Logger.error("Could not delete a dataset while uninstalling a plugin", {
    datasetId,
    error,
  });
  if (error instanceof DatasetDeleteError && error.reason === "still_present") {
    return "incomplete";
  }
  try {
    const remaining = await DatasetClient.getById({ id: datasetId });
    return remaining === undefined ? "deleted" : "incomplete";
  } catch (readError) {
    Logger.error("Could not tell whether a dataset was deleted", {
      datasetId,
      error: readError,
    });
    return "incomplete";
  }
}

/**
 * Deletes one dataset and says how it ended. A dataset whose row is already
 * missing, such as one deleted by someone else after the dialog loaded, is
 * left alone. A dataset that cannot be deleted is reported instead of thrown.
 * A dataset that cannot even be read first is `incomplete`: nothing was
 * deleted, but the admin should check it.
 */
async function _deleteDataset(datasetId: Dataset.Id): Promise<DatasetResult> {
  try {
    const existing = await DatasetClient.getById({ id: datasetId });
    if (existing === undefined) {
      return "already_gone";
    }
  } catch (error) {
    Logger.error("Could not read a dataset while uninstalling a plugin", {
      datasetId,
      error,
    });
    return "incomplete";
  }
  try {
    await DatasetClient.fullDelete({ id: datasetId });
    return "deleted";
  } catch (error) {
    return await _settleAfterFailedDelete({ datasetId, error });
  }
}

/** Lists the ids whose result is `wanted`, in the order they were deleted. */
function _selectIdsByResult(
  options: Readonly<{
    results: ReadonlyArray<{ datasetId: Dataset.Id; result: DatasetResult }>;
    wanted: DatasetResult;
  }>,
): Dataset.Id[] {
  return options.results
    .filter(({ result }) => {
      return result === options.wanted;
    })
    .map(({ datasetId }) => {
      return datasetId;
    });
}

/**
 * Uninstalls a plugin, then deletes the datasets the admin chose, one at a
 * time in the order given and each at most once. Use it where an admin
 * confirms an uninstall that may also delete what the plugin imported, such
 * as the uninstall dialog on a plugin's card. It returns the datasets it
 * deleted, the ones the user may not delete, and the ones whose delete did not
 * finish, so the caller can tell the admin which are untouched and which need
 * checking.
 *
 * Throws an `UninstallPluginError` when it cannot show the install is gone.
 * Nothing is deleted unless the install is gone, and a dataset the user may
 * not delete is never deleted. `fullDelete` removes a dataset's files before
 * its row, so a delete that fails after the access check can leave a dataset
 * with its data gone. Such a dataset is `incomplete`, not "still there". A
 * dataset that cannot be deleted does not stop the others.
 */
export async function uninstallPluginAndDeleteDatasets(
  options: Readonly<{
    installationId: PluginInstallation.Id;
    datasetIds: readonly Dataset.Id[];
  }>,
): Promise<UninstallOutcome> {
  await _deleteInstallationOrThrow(options.installationId);
  const results = await promiseMapSequential(
    Array.from(new Set(options.datasetIds)),
    async (datasetId) => {
      return { datasetId, result: await _deleteDataset(datasetId) };
    },
  );
  return {
    deletedDatasetIds: _selectIdsByResult({ results, wanted: "deleted" }),
    refusedDatasetIds: _selectIdsByResult({ results, wanted: "refused" }),
    incompleteDatasetIds: _selectIdsByResult({
      results,
      wanted: "incomplete",
    }),
  };
}
