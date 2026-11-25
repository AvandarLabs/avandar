import type { PluginVizRuntime } from "@/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime";

/**
 * The plugin chart runtime module object that `loadPluginVizRuntime`
 * resolves to.
 */
export type PluginVizRuntimeApi = typeof PluginVizRuntime;

function _importPluginVizRuntime(): Promise<PluginVizRuntimeApi> {
  return import("@/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime").then(
    (runtimeModule) => {
      return runtimeModule.PluginVizRuntime;
    },
  );
}

let pluginVizRuntimePromise: Promise<PluginVizRuntimeApi> | undefined;

/**
 * Loads the plugin chart runtime on first use and reuses it afterwards. The
 * runtime reaches the plugin SDK runtime and Lingui's message compiler, so it
 * loads when a plugin chart draws rather than with the app. A failed import
 * is forgotten, so the next call retries it.
 *
 * Keep the specifier in `import()` a literal path, so the bundler can split
 * the runtime into its own chunk.
 */
export function loadPluginVizRuntime(): Promise<PluginVizRuntimeApi> {
  pluginVizRuntimePromise ??= _importPluginVizRuntime().catch(
    (error: unknown) => {
      pluginVizRuntimePromise = undefined;
      throw error;
    },
  );
  return pluginVizRuntimePromise;
}
