import { where } from "@avandar/utils";
import { Outlet } from "@tanstack/react-router";
import { ReactNode, useMemo } from "react";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
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
  const [concepts] = ConceptClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const spotlightActions = useSpotlightActions(workspace.slug);

  const individualManagerLinks: NavbarLink[] = useMemo(() => {
    return (concepts ?? []).map((concept) => {
      const navLink = NavbarLinks.individualManagerHome({
        workspaceSlug: workspace.slug,
        conceptId: concept.id,
        conceptName: concept.name,
      });
      return navLink;
    });
  }, [workspace.slug, concepts]);

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
    links.push(NavbarLinks.ontologyDesignerHome(workspace.slug));
    links.push(...individualManagerLinks);

    return links;
  }, [
    workspace.slug,
    individualManagerLinks,
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
