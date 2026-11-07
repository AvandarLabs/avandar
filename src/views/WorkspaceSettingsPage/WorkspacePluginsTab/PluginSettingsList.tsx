import { getPluginIndexEntry } from "@/lib/plugins/pluginIndexHelpers";
import { PluginSettingsCard } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginSettingsCard";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

type Props = Readonly<{
  manifestModules: readonly PluginManifestModule[];
  installations: readonly PluginInstallation.T[];
  canManage: boolean;
}>;

/**
 * One settings card per bundled plugin, then one per installed plugin that
 * this deployment no longer bundles, so an admin can still uninstall it.
 */
export function PluginSettingsList({
  manifestModules,
  installations,
  canManage,
}: Props): JSX.Element {
  const unavailableInstallations = installations.filter((installation) => {
    return getPluginIndexEntry(installation.pluginId) === undefined;
  });
  return (
    <>
      {manifestModules.map((manifestModule) => {
        return (
          <PluginSettingsCard
            key={manifestModule.manifest.id}
            manifestModule={manifestModule}
            installation={installations.find((installation) => {
              return installation.pluginId === manifestModule.manifest.id;
            })}
            canManage={canManage}
          />
        );
      })}
      {unavailableInstallations.map((installation) => {
        return (
          <PluginSettingsCard
            key={installation.id}
            manifestModule={undefined}
            installation={installation}
            canManage={canManage}
          />
        );
      })}
    </>
  );
}
