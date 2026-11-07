import { relative, sep } from "node:path";
import type { PluginDirectory } from "@avandar/plugin-manifest/node";

/**
 * Vite's own default for `optimizeDeps.entries`: every HTML file under the
 * root. Setting `entries` replaces the default, so it has to be listed again.
 */
const DEFAULT_SCAN_ENTRY_PATTERN = "**/*.html";

/**
 * The `optimizeDeps.entries` that let Vite's startup dependency scan reach the
 * bundled plugins. A plugin is only reached through a dynamic `import()` in
 * `virtual:ava-plugin-index`, and the scan does not follow imports out of a
 * virtual module. Without these entries, an npm package that only a plugin
 * imports is first seen when the browser loads the plugin's chunk. Vite then
 * optimizes it and sends a full page reload, which closes whatever the user
 * had open, such as the plugin's own drawer. Listing each plugin's entry file
 * has the scan find those packages and bundle them at server start.
 *
 * Paths are relative to `repoRoot`, which is how Vite resolves entry globs.
 */
export function makeOptimizeDepsEntriesFromPlugins(options: {
  plugins: readonly PluginDirectory[];
  repoRoot: string;
}): string[] {
  const { plugins, repoRoot } = options;
  const pluginEntries = plugins.map((plugin) => {
    return relative(repoRoot, plugin.entryPath).split(sep).join("/");
  });
  return [DEFAULT_SCAN_ENTRY_PATTERN, ...pluginEntries];
}
