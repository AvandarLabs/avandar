import type { PluginManifest } from "@avandar/plugin-manifest/runtime";

/**
 * How much a plugin adds to the app, as plain counts. The Plugins settings
 * tab turns them into translated, pluralized copy.
 */
export type PluginContributionCounts = Readonly<{
  /** Buttons the plugin adds to the Data Explorer toolbar. */
  dataExplorerToolbarItems: number;
}>;

/**
 * Counts what a manifest contributes, for example to summarize a plugin on a
 * settings card before the plugin is installed.
 */
export function getContributionCountsFromManifest(
  manifest: PluginManifest,
): PluginContributionCounts {
  return {
    dataExplorerToolbarItems:
      manifest.contributes.menus["dataExplorer.toolbar"]?.length ?? 0,
  };
}
