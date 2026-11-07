import { where } from "@avandar/utils";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { getActivePluginsFromLoadablePlugins } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";
import { getLoadablePluginsFromInstallations } from "@/lib/plugins/getLoadablePluginsFromInstallations/getLoadablePluginsFromInstallations";
import { PluginModuleCache } from "@/lib/plugins/makePluginModuleCache/makePluginModuleCache";
import { PluginDrawerHost } from "@/lib/plugins/PluginDrawerHost/PluginDrawerHost";
import { ActivePluginsContext } from "@/lib/plugins/PluginHost/ActivePluginsContext";
import { getPluginIndexEntry } from "@/lib/plugins/pluginIndexHelpers";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { ReactNode } from "react";

type Props = Readonly<{ children: ReactNode }>;

// A stable default, so a workspace still loading its installs does not hand
// the memoized selection below a new array on every render.
const NO_INSTALLATIONS: PluginInstallation.T[] = [];

/**
 * Loads the manifests of the current workspace's enabled plugins and provides
 * the active ones to every plugin slot below it, such as a toolbar's plugin
 * buttons. It also mounts the drawer that plugin commands open. A workspace
 * with no installed plugins loads nothing.
 */
export function PluginHost({ children }: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [installations = NO_INSTALLATIONS] = PluginInstallationClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const loadable = useMemo(() => {
    return getLoadablePluginsFromInstallations({
      installations,
      getEntry: getPluginIndexEntry,
    });
  }, [installations]);
  const manifestsQuery = useQuery({
    queryKey: [
      "plugins",
      "manifests",
      ...loadable.map(({ entry }) => {
        return entry.id;
      }),
    ],
    queryFn: () => {
      return Promise.all(
        loadable.map(({ entry }) => {
          return PluginModuleCache.loadManifest(entry);
        }),
      );
    },
    enabled: loadable.length > 0,
    staleTime: Infinity,
  });
  const activePlugins = useMemo(() => {
    return getActivePluginsFromLoadablePlugins({
      loadable,
      manifestModules: manifestsQuery.data ?? [],
    });
  }, [loadable, manifestsQuery.data]);

  return (
    <ActivePluginsContext.Provider value={activePlugins}>
      {children}
      <PluginDrawerHost />
    </ActivePluginsContext.Provider>
  );
}
