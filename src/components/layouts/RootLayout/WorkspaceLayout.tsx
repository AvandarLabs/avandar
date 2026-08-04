import { Outlet } from "@tanstack/react-router";
import { where } from "@utils";
import { ReactNode, useMemo } from "react";
import { EntityConfigClient } from "@/clients/entity-configs/EntityConfigClient";
import { useSpotlightActions } from "@/components/layouts/RootLayout/useSpotlightActions";
import { WorkspaceLayoutContents } from "@/components/layouts/RootLayout/WorkspaceLayoutContents";
import { AppLinks } from "@/config/AppLinks";
import { NavbarLink, NavbarLinks } from "@/config/NavbarLinks";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useIsGlobalAdmin } from "@/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useWorkspaceLanguage } from "@/i18n/useLanguagePreference";
import { WorkspaceI18nProvider } from "@/i18n/WorkspaceI18nProvider";

type Props = {
  /**
   * The main content of the app shell.
   * Defaults to `<Outlet />` so it can be used in a router.
   */
  children?: ReactNode;
};

export function WorkspaceLayout({ children = <Outlet /> }: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const { locale } = useWorkspaceLanguage(workspace.id);
  const canAccessDataSources = useHasPermission(
    "data_sources__can_list_sources",
  );
  const canAccessDataExplorer = useHasPermission(
    "data_explorer__can_run_query",
  );
  const canAccessDashboards = useHasPermission(
    "dashboards__can_view_dashboard",
  );
  const canAccessSettings = useIsGlobalAdmin();
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
      return navLink;
    });
  }, [workspace.slug, entityConfigs]);

  const mainNavBarLinks = useMemo(() => {
    const links: NavbarLink[] = [NavbarLinks.workspaceHome(workspace.slug)];

    if (canAccessDataSources) {
      links.push(NavbarLinks.dataImport(workspace.slug));
    }

    if (canAccessDataExplorer) {
      links.push(NavbarLinks.dataExplorer(workspace.slug));
    }

    if (canAccessDashboards) {
      links.push(NavbarLinks.dashboards(workspace.slug));
    }

    links.push(NavbarLinks.map(workspace.slug));
    links.push(NavbarLinks.entityDesignerHome(workspace.slug));
    links.push(...entityManagerLinks);

    return links;
  }, [
    workspace.slug,
    entityManagerLinks,
    canAccessDataSources,
    canAccessDataExplorer,
    canAccessDashboards,
  ]);

  const utilityNavBarLinks = useMemo(() => {
    if (!canAccessSettings) {
      return [];
    }

    return [NavbarLinks.workspaceSettings(workspace.slug)];
  }, [workspace.slug, canAccessSettings]);

  const profileLink = useMemo(() => {
    return AppLinks.profile(workspace.slug);
  }, [workspace.slug]);

  return (
    <WorkspaceI18nProvider locale={locale}>
      <WorkspaceLayoutContents
        workspace={workspace}
        profileLink={profileLink}
        mainNavBarLinks={mainNavBarLinks}
        utilityNavBarLinks={utilityNavBarLinks}
        spotlightActions={spotlightActions}
      >
        {children}
      </WorkspaceLayoutContents>
    </WorkspaceI18nProvider>
  );
}
