import { getPluginInstallStatusFromInstallation } from "@/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation";
import type { LoadablePluginInstallation } from "@/lib/plugins/getLoadablePluginsFromInstallations/getLoadablePluginsFromInstallations";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

/** An installed plugin whose contributions are live in this workspace. */
export type ActivePlugin = LoadablePluginInstallation &
  Readonly<{ manifestModule: PluginManifestModule }>;

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
