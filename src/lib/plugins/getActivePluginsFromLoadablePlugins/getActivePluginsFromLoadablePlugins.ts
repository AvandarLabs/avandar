import { getPluginInstallStatusFromInstallation } from "@/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type {
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";

/** An enabled install of a bundled plugin, before its manifest loads. */
export type LoadablePluginInstallation = Readonly<{
  installation: PluginInstallation.T;
  entry: PluginIndexEntry;
}>;

/** An installed plugin whose contributions are live in this workspace. */
export type ActivePlugin = LoadablePluginInstallation &
  Readonly<{ manifestModule: PluginManifestModule }>;

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

/**
 * Pairs loadable installs with their manifests and keeps those whose status
 * is `installed`. A plugin asking for permissions not yet granted stays
 * hidden until an admin approves them. Tells the plugin host which plugins
 * may contribute menu items and commands.
 */
export function getActivePluginsFromLoadablePlugins(options: {
  loadable: readonly LoadablePluginInstallation[];
  manifestModules: readonly PluginManifestModule[];
}): ActivePlugin[] {
  return options.loadable.flatMap((loadablePlugin) => {
    const manifestModule = options.manifestModules.find((candidate) => {
      return candidate.manifest.id === loadablePlugin.entry.id;
    });
    if (manifestModule === undefined) {
      return [];
    }
    const status = getPluginInstallStatusFromInstallation({
      installation: loadablePlugin.installation,
      manifestPermissions: manifestModule.manifest.permissions,
    });
    return status === "installed"
      ? [{ ...loadablePlugin, manifestModule }]
      : [];
  });
}
