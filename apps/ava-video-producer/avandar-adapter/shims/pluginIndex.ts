import type { PluginIndexEntry } from "@/lib/plugins/PluginIndex.types";

/**
 * Film-only stand-in for `virtual:ava-plugin-index`, which only the product's
 * Vite build generates. It bundles no plugins, so a stored plugin chart shows
 * the product's missing-plugin placeholder.
 */
export const PLUGIN_INDEX: readonly PluginIndexEntry[] = [];
