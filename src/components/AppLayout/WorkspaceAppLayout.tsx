import { Outlet } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppLinks } from "@/config/AppLinks";
import { NavbarLink, NavbarLinks } from "@/config/NavbarLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AppShell } from "@/lib/ui/AppShell";
import { where } from "@/lib/utils/filters/filterBuilders";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { DataExplorerProvider } from "../DataExplorerApp/DataExplorerContext";
import { useSpotlightActions } from "./useSpotlightActions";

export function WorkspaceAppLayout({
  children = <Outlet />,
}: {
  children: React.ReactNode;
}): JSX.Element {
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
      return {
        link: navLink.link,
        icon: navLink.icon,
      };
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
