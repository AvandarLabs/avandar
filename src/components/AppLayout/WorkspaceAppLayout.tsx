import { useMemo } from "react";
import { AppLinks } from "@/config/AppLinks";
import { NavbarLink, NavbarLinks } from "@/config/NavbarLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AppShell } from "@/lib/ui/AppShell";
import { where } from "@/lib/utils/filters/filterBuilders";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { useSpotlightActions } from "./useSpotlightActions";

export function WorkspaceAppLayout(): JSX.Element {
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

  const navbarLinks = useMemo(() => {
    return [
      NavbarLinks.home,
      NavbarLinks.dataManagerHome(workspace.slug),
      NavbarLinks.dataExplorer(workspace.slug),
      NavbarLinks.entityDesignerHome(workspace.slug),
      ...entityManagerLinks,
    ];
  }, [workspace.slug, entityManagerLinks]);

  const profileLink = useMemo(() => {
    return AppLinks.profile(workspace.slug);
  }, [workspace.slug]);

  return (
    <AppShell
      title={workspace.name}
      profileLink={profileLink}
      navbarLinks={navbarLinks}
      spotlightActions={spotlightActions}
    />
  );
}
