import { useQuery } from "@avandar/query-hooks";
import { where } from "@avandar/utils";
import { useMemo } from "react";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { getActivePluginsFromLoadablePlugins } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";
import { getLoadablePluginsFromInstallations } from "@/lib/plugins/getLoadablePluginsFromInstallations/getLoadablePluginsFromInstallations";
import { loadManifestModules } from "@/lib/plugins/loadManifestModules/loadManifestModules";
import { PluginDrawerHost } from "@/lib/plugins/PluginDrawerHost/PluginDrawerHost";
import { ActivePluginsContext } from "@/lib/plugins/PluginHost/ActivePluginsContext";
import { getPluginIndexEntry } from "@/lib/plugins/pluginIndexHelpers";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { LoadablePluginInstallation } from "@/lib/plugins/getLoadablePluginsFromInstallations/getLoadablePluginsFromInstallations";
import type { LoadedManifestModules } from "@/lib/plugins/loadManifestModules/loadManifestModules";
import type { ReactNode } from "react";

type Props = Readonly<{ children: ReactNode }>;

// A stable default, so a workspace still loading its installs does not hand
// the memoized selection below a new array on every render.
const NO_INSTALLATIONS: PluginInstallation.T[] = [];

// A stable default, so the active selection below keeps its identity while
// the manifests are still loading.
const NO_MANIFESTS: LoadedManifestModules = {
  manifestModules: [],
  hasFailures: false,
};

/**
 * Loads the manifests of the given plugins, each on its own so one failure
 * does not hide the rest. Gives an empty result until the first load ends.
 */
function useLoadedManifests(
  loadable: readonly LoadablePluginInstallation[],
): LoadedManifestModules {
  // Sorted, so installs arriving in another order reuse the same query.
  const sortedPluginIds = useMemo(() => {
    return loadable
      .map(({ entry }) => {
        return entry.id;
      })
      .toSorted();
  }, [loadable]);
  const [loadedManifests = NO_MANIFESTS] = useQuery({
    queryKey: ["plugins", "manifests", ...sortedPluginIds],
    queryFn: () => {
      return loadManifestModules({
        entries: loadable.map(({ entry }) => {
          return entry;
        }),
      });
    },
    enabled: loadable.length > 0,
    // Never written to disk. A manifest module carries React icon
    // components, and JSON persistence turns each one into `{}`, which
    // crashes the render that reads it after a reload.
    meta: { persist: false },
    // A manifest that failed to load is retried the next time the query is
    // used, while a fully loaded set stays cached.
    staleTime: (query) => {
      return query.state.data?.hasFailures ? 0 : Infinity;
    },
    // Installing a plugin changes the key. Keep the loaded plugins active
    // until the new set arrives, rather than hiding them while it loads.
    usePreviousDataAsPlaceholder: true,
  });
  return loadedManifests;
}

/**
 * Loads the manifests of the current workspace's enabled plugins and provides
 * the active ones to every plugin slot below it, such as a toolbar's plugin
 * buttons. It also mounts the drawer that plugin commands open. A workspace
 * with no installed plugins loads nothing.
 */
export function PluginHost({ children }: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  // Refetched on mount, because a reload right after an install restores the
  // pre-install snapshot from the persisted cache, which would otherwise
  // count as fresh and hide the new plugin until it goes stale.
  const [installations = NO_INSTALLATIONS] = PluginInstallationClient.useGetAll(
    {
      ...where("workspace_id", "eq", workspace.id),
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    },
  );
  const loadable = useMemo(() => {
    return getLoadablePluginsFromInstallations({
      installations,
      getEntry: getPluginIndexEntry,
    });
  }, [installations]);
  const { manifestModules } = useLoadedManifests(loadable);
  const activePlugins = useMemo(() => {
    return getActivePluginsFromLoadablePlugins({ loadable, manifestModules });
  }, [loadable, manifestModules]);

  return (
    <ActivePluginsContext.Provider value={activePlugins}>
      {children}
      <PluginDrawerHost />
    </ActivePluginsContext.Provider>
  );
}
