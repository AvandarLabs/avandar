import { useMemo } from "react";
import { AppLinks } from "@/config/AppLinks";
import { NavbarLink, NavbarLinks } from "@/config/NavbarLinks";
import { useCurrentWorkspaceSlug } from "@/lib/hooks/workspaces/useCurrentWorkspaceSlug";
import { AppShell } from "@/lib/ui/AppShell";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { useSpotlightActions } from "./useSpotlightActions";

export function WorkspaceAppLayout(): JSX.Element {
  const [entityConfigs] = EntityConfigClient.useGetAll();
  const workspaceSlug = useCurrentWorkspaceSlug();
  const spotlightActions = useSpotlightActions(workspaceSlug);
  const entityManagerLinks: NavbarLink[] = useMemo(() => {
    return (entityConfigs ?? []).map((entityConfig) => {
      const navLink = NavbarLinks.entityManagerHome({
        workspaceSlug: workspaceSlug,
        entityConfigId: entityConfig.id,
        entityConfigName: entityConfig.name,
      });
      return {
        link: navLink.link,
        icon: navLink.icon,
      };
    });
  }, [workspaceSlug, entityConfigs]);

  const navbarLinks = [
    NavbarLinks.home,
    NavbarLinks.dataManagerHome(workspaceSlug),
    NavbarLinks.dataExplorer(workspaceSlug),
    NavbarLinks.entityDesignerHome(workspaceSlug),
    ...entityManagerLinks,
  ];

  const profileLink = useMemo(() => {
    return AppLinks.profile(workspaceSlug);
  }, [workspaceSlug]);

  return (
    <AppShell
      profileLink={profileLink}
      navbarLinks={navbarLinks}
      spotlightActions={spotlightActions}
    />
  );
}
