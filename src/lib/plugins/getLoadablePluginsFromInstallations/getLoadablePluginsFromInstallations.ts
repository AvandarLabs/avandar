import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginIndexEntry } from "@/lib/plugins/PluginIndex.types";

/** An enabled install of a bundled plugin, before its manifest loads. */
export type LoadablePluginInstallation = Readonly<{
  installation: PluginInstallation.T;
  entry: PluginIndexEntry;
}>;

/**
 * Enabled installs of plugins this deployment bundles, each paired with its
 * index entry. Tells the plugin host which manifests are worth loading for a
 * workspace.
 */
export function getLoadablePluginsFromInstallations(options: {
  installations: readonly PluginInstallation.T[];
  getEntry: (pluginId: string) => PluginIndexEntry | undefined;
}): LoadablePluginInstallation[] {
  return options.installations.flatMap((installation) => {
    const entry = options.getEntry(installation.pluginId);
    return installation.isEnabled && entry !== undefined
      ? [{ installation, entry }]
      : [];
  });
}
