import { PLUGIN_INDEX } from "virtual:ava-plugin-index";
import type { PluginIndexEntry } from "@/lib/plugins/PluginIndex.types";

/**
 * Every plugin this deployment bundles. Lets the plugin host list what a
 * workspace can install, for example in the Plugins settings tab.
 */
export function getBundledPluginEntries(): readonly PluginIndexEntry[] {
  return PLUGIN_INDEX;
}

/**
 * The bundled plugin with `pluginId`, if this deployment bundles it. Lets a
 * stored install be matched back to its loadable code, for example when a
 * workspace still holds an install of a plugin that was since removed.
 */
export function getPluginIndexEntry(
  pluginId: string,
): PluginIndexEntry | undefined {
  return PLUGIN_INDEX.find((entry) => {
    return entry.id === pluginId;
  });
}
