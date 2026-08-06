import { ModalsProvider } from "@mantine/modals";
import { AppDropzone } from "@/components/AppDropzone/AppDropzone";
import { AppShell } from "@/components/AppShell/AppShell";
import { ChatPanelProvider } from "@/components/ChatPanel/ChatPanelProvider/ChatPanelProvider";
import { useRootWorkspaceChecks } from "@/components/layouts/RootLayout/useRootWorkspaceChecks/useRootWorkspaceChecks";
import { useSpotlightActions } from "@/components/layouts/RootLayout/useSpotlightActions";
import { AppLinks } from "@/config/AppLinks";
import { DEFAULT_MODAL_PROPS } from "@/config/Theme";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { NavbarLink } from "@/config/NavbarLinks";
import type { ReactNode } from "react";

type Props = {
  workspace: ReturnType<typeof useCurrentWorkspace>;
  profileLink: ReturnType<typeof AppLinks.profile>;
  mainNavBarLinks: NavbarLink[];
  utilityNavBarLinks: NavbarLink[];
  spotlightActions: ReturnType<typeof useSpotlightActions>;
  children: ReactNode;
};

/** Provides workspace-scoped state and renders the application shell. */
export function WorkspaceLayoutContents({
  workspace,
  profileLink,
  mainNavBarLinks,
  utilityNavBarLinks,
  spotlightActions,
  children,
}: Props): JSX.Element {
  useRootWorkspaceChecks();

  return (
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
  );
}
