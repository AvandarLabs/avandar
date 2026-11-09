import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { useLingui } from "@lingui/react/macro";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

/**
 * The name and description of a plugin in the current language, for its
 * settings card. A plugin this deployment no longer bundles has no manifest,
 * so it is named by its stored id and has an empty description.
 */
export function usePluginDisplayText(options: {
  manifestModule: PluginManifestModule | undefined;
  installation: PluginInstallation.T | undefined;
}): { pluginName: string; description: string } {
  const { manifestModule, installation } = options;
  const { i18n } = useLingui();
  if (manifestModule === undefined) {
    return { pluginName: installation?.pluginId ?? "", description: "" };
  }
  const { manifest, strings } = manifestModule;
  const getText = (value: string): string => {
    return getLocalizedTextFromManifestStrings({
      strings,
      locale: i18n.locale,
      value,
    });
  };
  return {
    pluginName: getText(manifest.name),
    description: getText(manifest.description),
  };
}
