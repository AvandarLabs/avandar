import { useMemo } from "react";
import { AppLinks } from "@/config/AppLinks";
import { NavbarLink, NavbarLinks } from "@/config/NavbarLinks";
import { AppShell } from "@/lib/ui/AppShell";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { useSpotlightActions } from "./useSpotlightActions";

export function WorkspaceAppLayout(): JSX.Element {
  const [entityConfigs] = EntityConfigClient.useGetAll();
  // TODO(jpsyx): get a real workspace slug
  const workspaceSlug = "avandar-labs";

  const spotlightActions = useSpotlightActions("avandar-labs");
  const entityManagerLinks: NavbarLink[] = useMemo(() => {
    return (entityConfigs ?? []).map((entityConfig) => {
      const navLink = NavbarLinks.entityManager({
        workspaceSlug,
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
    NavbarLinks.dataManager(workspaceSlug),
    NavbarLinks.dataExplorer(workspaceSlug),
    NavbarLinks.entityDesigner(workspaceSlug),
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
