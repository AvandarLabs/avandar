import { ModalsProvider } from "@mantine/modals";
import { Outlet } from "@tanstack/react-router";
import { where } from "@utils";
import { ReactNode, useMemo } from "react";
import { EntityConfigClient } from "@/clients/entity-configs/EntityConfigClient";
import { AppDropzone } from "@/components/AppDropzone/AppDropzone";
import { AppShell } from "@/components/AppShell/AppShell";
import { ChatPanelProvider } from "@/components/ChatPanel/ChatPanelProvider/ChatPanelProvider";
import { useRootWorkspaceChecks } from "@/components/layouts/RootLayout/useRootWorkspaceChecks/useRootWorkspaceChecks";
import { useSpotlightActions } from "@/components/layouts/RootLayout/useSpotlightActions";
import { AppLinks } from "@/config/AppLinks";
import { NavbarLink, NavbarLinks } from "@/config/NavbarLinks";
import { DEFAULT_MODAL_PROPS } from "@/config/Theme";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useIsGlobalAdmin } from "@/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useWorkspaceLanguage } from "@/i18n/useLanguagePreference";
import { WorkspaceI18nProvider } from "@/i18n/WorkspaceI18nProvider";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";

type Props = {
  /**
   * The main content of the app shell.
   * Defaults to `<Outlet />` so it can be used in a router.
   */
  children?: ReactNode;
};

export function WorkspaceLayout({ children = <Outlet /> }: Props): JSX.Element {
  useRootWorkspaceChecks();

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
    links.push(NavbarLinks.sharedWithMe(workspace.slug));

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
      <ModalsProvider modalProps={DEFAULT_MODAL_PROPS}>
        <DataExplorerStateManager.Provider>
          <DashboardEditorStateManager.Provider>
            <ChatPanelProvider>
              <AppDropzone>
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
              </AppDropzone>
            </ChatPanelProvider>
          </DashboardEditorStateManager.Provider>
        </DataExplorerStateManager.Provider>
      </ModalsProvider>
    </WorkspaceI18nProvider>
  );
}
