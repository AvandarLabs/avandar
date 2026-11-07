import type { PluginIndexEntry } from "@/lib/plugins/PluginIndex.types";

/**
 * Stand-in for `virtual:ava-plugin-index` under Vitest, where the Vite plugin
 * that generates it is not registered. Tests that need entries mock
 * `@/lib/plugins/pluginIndex`.
 */
export const PLUGIN_INDEX: readonly PluginIndexEntry[] = [];
