import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { PluginContentImportClient } from "@/clients/plugins/PluginContentImportClient/PluginContentImportClient";
import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import {
  notifyError,
  notifySuccess,
  notifyWarning,
} from "@/utils/notifications/notify";
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

/** Refreshes every list an uninstall can change, such as Data Sources. */
function _invalidateUninstallQueries(queryClient: QueryClient): void {
  [
    PluginInstallationClient.QueryKeys.getAll(),
    PluginContentImportClient.QueryKeys.getAll(),
    PluginDataSlotBindingClient.QueryKeys.getAll(),
    DatasetClient.QueryKeys.getAll(),
  ].forEach((queryKey) => {
    void queryClient.invalidateQueries({ queryKey });
  });
}

/**
 * Uninstalls the plugin, deletes the chosen datasets, and refreshes the lists
 * that showed them. Throws when the uninstall itself fails.
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
  const { failedDatasetIds } = await uninstallPluginAndDeleteDatasets({
    installationId: options.installationId,
    datasetIds,
  });
  _invalidateUninstallQueries(options.queryClient);
  return {
    deletedCount: datasetIds.length - failedDatasetIds.length,
    failedNames: rows
      .filter((row) => {
        return failedDatasetIds.includes(row.datasetId);
      })
      .map((row) => {
        return row.name;
      }),
  };
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
  const [isRunning, setIsRunning] = useState(false);
  const run = async (datasetIds: readonly Dataset.Id[]): Promise<void> => {
    setIsRunning(true);
    try {
      const summary = await _uninstallAndRefresh({
        installationId: options.installationId,
        datasetIds,
        rows: options.rows,
        queryClient,
      });
      notifyOutcome(summary);
      options.onDone();
    } catch (error) {
      notifyError({
        title: t`Could not update ${pluginName}`,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsRunning(false);
    }
  };
  return { run, isRunning };
}
