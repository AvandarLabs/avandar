import { PluginModuleCache } from "@/lib/plugins/makePluginModuleCache/makePluginModuleCache";
import { Logger } from "@/utils/Logger";
import type {
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";

/** The manifests that loaded, and whether any other manifest failed to. */
export type LoadedManifestModules = Readonly<{
  manifestModules: PluginManifestModule[];
  hasFailures: boolean;
}>;

/**
 * Loads each plugin's manifest independently, so one plugin whose chunk
 * fails to load does not hide the others. Each failure is logged with its
 * plugin id, and `hasFailures` tells the caller to retry later. Lets the
 * plugin host activate every plugin that did load.
 */
export async function loadManifestModules(options: {
  entries: readonly PluginIndexEntry[];
}): Promise<LoadedManifestModules> {
  const { entries } = options;
  const results = await Promise.allSettled(
    entries.map((entry) => {
      return PluginModuleCache.loadManifest(entry);
    }),
  );
  const manifestModules = results.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      return [result.value];
    }
    Logger.error("Plugin manifest failed to load", {
      pluginId: entries[index]?.id,
      error: result.reason,
    });
    return [];
  });
  return {
    manifestModules,
    hasFailures: manifestModules.length < entries.length,
  };
}
