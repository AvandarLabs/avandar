import { useLingui } from "@lingui/react/macro";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";

/**
 * The update and uninstall mutations for one plugin, with the success and
 * error notifications the Plugins settings tab shows. Every mutation
 * invalidates all plugin installation `getAll` queries, which are keyed by
 * prefix, so the plugin host's workspace-filtered query refetches and a
 * change shows up in the running app without a reload. Installing goes
 * through the install wizard instead.
 */
export function usePluginInstallationMutations(pluginName: string): {
  updateInstallation: ReturnType<typeof PluginInstallationClient.useUpdate>[0];
  deleteInstallation: ReturnType<typeof PluginInstallationClient.useDelete>[0];
  isPending: boolean;
} {
  const { t } = useLingui();
  const queriesToInvalidate = [PluginInstallationClient.QueryKeys.getAll()];
  const onError = (error: Error): void => {
    notifyError({
      title: t`Could not update ${pluginName}`,
      message: error.message,
    });
  };
  const [updateInstallation, isUpdating] = PluginInstallationClient.useUpdate({
    queriesToInvalidate,
    onError,
  });
  const [deleteInstallation, isDeleting] = PluginInstallationClient.useDelete({
    queriesToInvalidate,
    onSuccess: () => {
      notifySuccess(t`${pluginName} uninstalled`);
    },
    onError,
  });
  return {
    updateInstallation,
    deleteInstallation,
    isPending: isUpdating || isDeleting,
  };
}
