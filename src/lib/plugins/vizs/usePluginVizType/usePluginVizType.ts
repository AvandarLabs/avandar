import { useQuery } from "@avandar/query-hooks";
import { useMemo } from "react";
import { PluginModuleCache } from "@/lib/plugins/makePluginModuleCache/makePluginModuleCache";
import { getPluginIndexEntry } from "@/lib/plugins/pluginIndexHelpers";
import { getPluginVizTypeFromManifest } from "@/lib/plugins/vizs/getPluginVizTypeFromManifest/getPluginVizTypeFromManifest";
import { Logger } from "@/utils/Logger";
import type {
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";
import type { PluginVizSelection } from "@/lib/plugins/vizs/pluginVizOptionHelpers";
import type { PluginVizType } from "@avandar/plugin-manifest/runtime";

/**
 * Where the lookup of a plugin chart type stands, for a chart renderer or a
 * settings form to branch on.
 *
 * - `loading`: the plugin's manifest chunk is downloading.
 * - `missing`: there is nothing to look up, this deployment does not bundle
 *   the plugin, its manifest declares no such chart type, or its manifest
 *   failed to load.
 * - `ready`: carries the plugin's index entry, its manifest, and the chart
 *   type.
 */
export type PluginVizTypeLookup =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "missing" }>
  | Readonly<{
      status: "ready";
      entry: PluginIndexEntry;
      manifestModule: PluginManifestModule;
      vizType: PluginVizType;
    }>;

/**
 * A bundled plugin's entry and manifest. The entry is undefined when this
 * deployment does not bundle the plugin, and the manifest is undefined when
 * there is no entry or the manifest failed to load.
 */
type LoadedPluginManifest = Readonly<{
  entry: PluginIndexEntry | undefined;
  manifestModule: PluginManifestModule | undefined;
}>;

const LOADING: PluginVizTypeLookup = { status: "loading" };
const MISSING: PluginVizTypeLookup = { status: "missing" };

async function _loadPluginManifest(
  pluginId: string | undefined,
): Promise<LoadedPluginManifest> {
  const entry =
    pluginId === undefined ? undefined : getPluginIndexEntry(pluginId);
  if (entry === undefined) {
    return { entry, manifestModule: undefined };
  }
  try {
    return {
      entry,
      manifestModule: await PluginModuleCache.loadManifest(entry),
    };
  } catch (error) {
    Logger.error("Plugin manifest failed to load", { pluginId, error });
    return { entry, manifestModule: undefined };
  }
}

function _hasFailedToLoad(loaded: LoadedPluginManifest | undefined): boolean {
  return loaded?.entry !== undefined && loaded.manifestModule === undefined;
}

function _getLookupFromLoadedManifest(options: {
  loaded: LoadedPluginManifest | undefined;
  pluginVizId: string;
}): PluginVizTypeLookup {
  const { loaded, pluginVizId } = options;
  if (loaded === undefined) {
    return LOADING;
  }
  const { entry, manifestModule } = loaded;
  if (entry === undefined || manifestModule === undefined) {
    return MISSING;
  }
  const vizType = getPluginVizTypeFromManifest({
    manifest: manifestModule.manifest,
    pluginVizId,
  });
  return vizType === undefined
    ? MISSING
    : { status: "ready", entry, manifestModule, vizType };
}

/**
 * Looks up a plugin chart type in the plugins this deployment bundles,
 * loading the plugin's manifest at most once per session. It reads neither
 * the workspace's installs nor the plugin host, so a stored plugin chart can
 * be looked up anywhere, for example on a public dashboard link. A manifest
 * that failed to load is loaded again the next time the lookup is used. Pass
 * undefined to look up nothing.
 */
export function usePluginVizType(
  selection: PluginVizSelection | undefined,
): PluginVizTypeLookup {
  const pluginId = selection?.pluginId;
  const pluginVizId = selection?.pluginVizId;
  const [loaded] = useQuery({
    queryKey: ["plugins", "vizManifest", pluginId],
    queryFn: () => {
      return _loadPluginManifest(pluginId);
    },
    enabled: pluginId !== undefined,
    // Never written to disk. A manifest module carries React icon
    // components, and JSON persistence turns each one into `{}`.
    meta: { persist: false },
    staleTime: (query) => {
      return _hasFailedToLoad(query.state.data) ? 0 : Infinity;
    },
  });
  return useMemo(() => {
    return pluginVizId === undefined
      ? MISSING
      : _getLookupFromLoadedManifest({ loaded, pluginVizId });
  }, [loaded, pluginVizId]);
}
