import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifest } from "@avandar/plugin-manifest/runtime";

/** The install wizard's Install action and what it has done so far. */
export type PluginInstaller = Readonly<{
  /** Installs the plugin with every permission it asks for. */
  install: (bindings: readonly PluginDataSlotBinding.Draft[]) => void;
  isInstalling: boolean;

  /** The new install, once the install succeeded. */
  installation: PluginInstallation.T | undefined;
}>;

/**
 * Installs one plugin in the current workspace, together with the data slot
 * bindings an admin chose, from the install wizard's Confirm step. It shows
 * the same success and error notifications as the other plugin actions, and
 * refreshes every plugin installs query so the plugin turns on right away.
 * `onInstalled` runs once the install is saved, for example to import the
 * plugin's content.
 */
export function useInstallPlugin(options: {
  pluginName: string;
  manifest: PluginManifest;
  onInstalled?: (installation: PluginInstallation.T) => void;
}): PluginInstaller {
  const { pluginName, manifest, onInstalled } = options;
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [installation, setInstallation] = useState<PluginInstallation.T>();
  const [installPlugin, isInstalling] = PluginInstallationClient.useInstall({
    queriesToInvalidate: [PluginInstallationClient.QueryKeys.getAll()],
    onSuccess: (newInstallation) => {
      notifySuccess(t`${pluginName} installed`);
      setInstallation(newInstallation);
      onInstalled?.(newInstallation);
    },
    onError: (error) => {
      notifyError({
        title: t`Could not install ${pluginName}`,
        message: error.message,
      });
    },
  });
  return {
    isInstalling,
    installation,
    install: (bindings) => {
      installPlugin({
        workspaceId: workspace.id,
        pluginId: manifest.id,
        installedVersion: manifest.version,
        grantedPermissions: [...manifest.permissions],
        bindings,
      });
    },
  };
}
