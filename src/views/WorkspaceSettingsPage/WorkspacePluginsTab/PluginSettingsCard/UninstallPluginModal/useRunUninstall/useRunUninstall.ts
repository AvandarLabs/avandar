import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { PluginContentImportClient } from "@/clients/plugins/PluginContentImportClient/PluginContentImportClient";
import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { Logger } from "@/utils/Logger";
import {
  notifyError,
  notifySuccess,
  notifyWarning,
} from "@/utils/notifications/notify";
import { UninstallPluginError } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/UninstallPluginError";
import { uninstallPluginAndDeleteDatasets } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/uninstallPluginAndDeleteDatasets";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { UninstallContentRow } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows";
import type { QueryClient } from "@tanstack/react-query";

/** What an uninstall did, as the notification needs it. */
type UninstallSummary = {
  deletedCount: number;

  /** The names of the chosen datasets that could not be deleted. */
  failedNames: string[];
};

/**
 * Refreshes every list an uninstall can change, such as Data Sources, and
 * resolves once the lists on screen have reloaded. The modal closes after
 * that, so the plugin's card has already lost its Uninstall button when
 * focus moves back to it.
 */
async function _invalidateUninstallQueries(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all(
    [
      PluginInstallationClient.QueryKeys.getAll(),
      PluginContentImportClient.QueryKeys.getAll(),
      PluginDataSlotBindingClient.QueryKeys.getAll(),
      DatasetClient.QueryKeys.getAll(),
    ].map((queryKey) => {
      return queryClient.invalidateQueries({ queryKey });
    }),
  );
}

/**
 * Refreshes the lists an uninstall changes, and logs instead of throwing when
 * a refresh fails, so a failed refresh cannot hide how the uninstall went.
 */
async function _refreshQueriesOrLog(queryClient: QueryClient): Promise<void> {
  try {
    await _invalidateUninstallQueries(queryClient);
  } catch (error) {
    Logger.error("Could not refresh the lists after an uninstall", { error });
  }
}

/**
 * Uninstalls the plugin, deletes the chosen datasets, and refreshes the lists
 * that showed them, whether or not the uninstall succeeded. Throws when the
 * uninstall itself fails.
 */
async function _uninstallAndRefresh(
  options: Readonly<{
    installationId: PluginInstallation.Id;
    datasetIds: readonly Dataset.Id[];
    rows: readonly UninstallContentRow[];
    queryClient: QueryClient;
  }>,
): Promise<UninstallSummary> {
  const { datasetIds, rows } = options;
  try {
    const { deletedDatasetIds, failedDatasetIds } =
      await uninstallPluginAndDeleteDatasets({
        installationId: options.installationId,
        datasetIds,
      });
    return {
      deletedCount: deletedDatasetIds.length,
      failedNames: rows
        .filter((row) => {
          return failedDatasetIds.includes(row.datasetId);
        })
        .map((row) => {
          return row.name;
        }),
    };
  } finally {
    // Also after a failure: the install row may be gone even when the check
    // that proves it throws, so the lists must not keep showing it.
    await _refreshQueriesOrLog(options.queryClient);
  }
}

/** Says how the uninstall went, naming any dataset it could not delete. */
function useNotifyUninstallOutcome(
  pluginName: string,
): (summary: UninstallSummary) => void {
  const { t, i18n } = useLingui();
  return ({ deletedCount, failedNames }) => {
    const title = t`${pluginName} uninstalled`;
    if (failedNames.length > 0) {
      const names = new Intl.ListFormat(i18n.locale, {
        type: "conjunction",
      }).format(failedNames);
      notifyWarning({
        title,
        message: t`These datasets could not be deleted and are still in Data Sources: ${names}`,
      });
      return;
    }
    if (deletedCount === 0) {
      notifySuccess(title);
      return;
    }
    notifySuccess({
      title,
      message: plural(deletedCount, {
        one: "# dataset deleted.",
        other: "# datasets deleted.",
      }),
    });
  };
}

/**
 * Returns a function that turns an uninstall failure into the message the
 * admin reads. An `UninstallPluginError` gets copy chosen by its `reason`.
 * Any other error gets a generic sentence, since its own message is developer
 * text and is only logged.
 */
function useBuildUninstallErrorMessage(
  pluginName: string,
): (error: unknown) => string {
  const { t } = useLingui();
  return (error) => {
    if (error instanceof UninstallPluginError) {
      return error.reason === "still_installed"
        ? t`${pluginName} is still installed. You may not have permission to uninstall it.`
        : t`We could not confirm the uninstall. Check the plugin list, then try again.`;
    }
    return t`Something went wrong while uninstalling. Try again.`;
  };
}

/** What `useRunUninstall` gives the uninstall modal. */
type RunUninstall = {
  /** Uninstalls the plugin and deletes the datasets with these ids. */
  run: (datasetIds: readonly Dataset.Id[]) => Promise<void>;
  isRunning: boolean;
};

/**
 * Runs an uninstall from the uninstall modal: uninstalls, deletes the
 * chosen datasets, refreshes the lists they appear in, says how it went,
 * and closes the modal. When the uninstall itself fails, it says so and
 * leaves the modal open.
 */
export function useRunUninstall(
  options: Readonly<{
    pluginName: string;
    installationId: PluginInstallation.Id;
    rows: readonly UninstallContentRow[];
    onDone: () => void;
  }>,
): RunUninstall {
  const { t } = useLingui();
  const { pluginName } = options;
  const queryClient = useQueryClient();
  const notifyOutcome = useNotifyUninstallOutcome(pluginName);
  const buildErrorMessage = useBuildUninstallErrorMessage(pluginName);
  const [isRunning, setIsRunning] = useState(false);
  const run = async (datasetIds: readonly Dataset.Id[]): Promise<void> => {
    setIsRunning(true);
    let summary: UninstallSummary;
    try {
      summary = await _uninstallAndRefresh({
        installationId: options.installationId,
        datasetIds,
        rows: options.rows,
        queryClient,
      });
    } catch (error) {
      Logger.error("Could not uninstall a plugin", {
        installationId: options.installationId,
        error,
      });
      notifyError({
        title: t`Could not update ${pluginName}`,
        message: buildErrorMessage(error),
      });
      return;
    } finally {
      setIsRunning(false);
    }
    notifyOutcome(summary);
    options.onDone();
  };
  return { run, isRunning };
}
