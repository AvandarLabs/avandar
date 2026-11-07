import { useQuery } from "@avandar/query-hooks";
import { loadManifestModules } from "@/lib/plugins/loadManifestModules/loadManifestModules";
import { getBundledPluginEntries } from "@/lib/plugins/pluginIndexHelpers";
import type { LoadedManifestModules } from "@/lib/plugins/loadManifestModules/loadManifestModules";
import type { UseQueryResultTuple } from "@avandar/query-hooks";

type BundledManifestsResult = UseQueryResultTuple<LoadedManifestModules>;

/**
 * Loads the manifest of every plugin this deployment bundles, so the Plugins
 * settings tab can describe plugins a workspace has not installed yet. A
 * manifest that fails to load does not hide the rest, and the next use of
 * the query retries it.
 */
export function useBundledPluginManifests(): BundledManifestsResult {
  return useQuery({
    queryKey: ["plugins", "settings", "bundledManifests"],
    // Never written to disk. A manifest module carries React icon
    // components, and JSON persistence turns each one into `{}`, which
    // crashes the render that reads it after a reload.
    meta: { persist: false },
    queryFn: () => {
      return loadManifestModules({ entries: getBundledPluginEntries() });
    },
    staleTime: (query) => {
      return query.state.data?.hasFailures ? 0 : Infinity;
    },
  });
}
