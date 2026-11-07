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
    queryFn: () => {
      return loadManifestModules({ entries: getBundledPluginEntries() });
    },
    staleTime: (query) => {
      return query.state.data?.hasFailures ? 0 : Infinity;
    },
  });
}
