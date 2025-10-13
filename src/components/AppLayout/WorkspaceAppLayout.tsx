import { Outlet } from "@tanstack/react-router";
import { ReactNode, useMemo } from "react";
import { AppLinks } from "@/config/AppLinks";
import { NavbarLink, NavbarLinks } from "@/config/NavbarLinks";
import { useEnsureLocalStoragePersistence } from "@/hooks/browser/useEnsureLocalStoragePersistence";
import { useCheckLocallyLoadedDatasets } from "@/hooks/datasets/useCheckLocallyLoadedDatasets";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AppShell } from "@/lib/ui/AppShell";
import { where } from "@/lib/utils/filters/filterBuilders";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { DataExplorerProvider } from "../DataExplorerApp/DataExplorerContext";
import { useSpotlightActions } from "./useSpotlightActions";

type Props = {
  /**
   * The main content of the app shell.
   * Defaults to `<Outlet />` so it can be used in a router.
   */
  children?: ReactNode;
};

// Hooks that need to run at the root level of the workspace
function useWorkspaceChecks() {
  useEnsureLocalStoragePersistence();

  // At the root level of the app we should check if this workspace
  // is missing any datasets that *should* be locally loaded
  useCheckLocallyLoadedDatasets();
}

export function WorkspaceAppLayout({
  children = <Outlet />,
}: Props): JSX.Element {
  useWorkspaceChecks();

  const workspace = useCurrentWorkspace();
  const [entityConfigs] = EntityConfigClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const spotlightActions = useSpotlightActions(workspace.slug);

  const entityManagerLinks: NavbarLink[] = useMemo(() => {
    return (entityConfigs ?? []).map((entityConfig) => {
      const navLink = NavbarLinks.entityManagerHome({
        workspaceSlug: workspace.slug,
        entityConfigId: entityConfig.id,
        entityConfigName: entityConfig.name,
      });
      return { link: navLink.link, icon: navLink.icon };
    });
  }, [workspace.slug, entityConfigs]);

  const mainNavBarLinks = useMemo(() => {
    return [
      NavbarLinks.workspaceHome(workspace.slug),
      NavbarLinks.dataManagerHome(workspace.slug),
      NavbarLinks.dataExplorer(workspace.slug),
      NavbarLinks.entityDesignerHome(workspace.slug),
      ...entityManagerLinks,
    ];
  }, [workspace.slug, entityManagerLinks]);

  const utilityNavBarLinks = useMemo(() => {
    return [NavbarLinks.workspaceSettings(workspace.slug)];
  }, [workspace.slug]);

  const profileLink = useMemo(() => {
    return AppLinks.profile(workspace.slug);
  }, [workspace.slug]);

  return (
    <DataExplorerProvider>
      <AppShell
        title={workspace.name}
        currentWorkspace={workspace}
        profileLink={profileLink}
        navbarLinks={mainNavBarLinks}
        utilityLinks={utilityNavBarLinks}
        spotlightActions={spotlightActions}
      >
        {children}
      </AppShell>
    </DataExplorerProvider>
  );
}
