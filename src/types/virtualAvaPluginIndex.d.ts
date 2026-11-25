declare module "virtual:ava-plugin-index" {
  import type { PluginIndexEntry } from "@/lib/plugins/PluginIndex.types";

  /** Every plugin this deployment bundles, with lazy loaders. */
  export const PLUGIN_INDEX: readonly PluginIndexEntry[];
}
