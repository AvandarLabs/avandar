import { propEq } from "@avandar/utils";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Workspace } from "$/models/Workspace/Workspace";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { RootLayout } from "@/components/layouts/RootLayout/RootLayout";
import { AppLinks } from "@/config/AppLinks/AppLinks";

export const Route = createFileRoute("/_auth/$workspaceSlug")({
  component: WorkspaceRootLayout,
  loader: async ({
    params,
    context,
  }): Promise<Workspace.WithSubscription | undefined> => {
    const { queryClient } = context;
    const { workspaceSlug } = params;
    const workspaces = await WorkspaceClient.getWorkspacesOfCurrentUser();
    queryClient.setQueryData(
      WorkspaceClient.QueryKeys.getWorkspacesOfCurrentUser(),
      workspaces,
    );
    const workspaceToLoad = workspaces.find(propEq("slug", workspaceSlug));
    if (!workspaceToLoad) {
      throw redirect({ to: AppLinks.invalidWorkspace.to });
    }

    // `useCurrentWorkspace` reads this loader value as the authoritative
    // workspace context for descendants of this route.
    return workspaceToLoad;
  },
});

/**
 * This is the layout for loading a workspace.
 */
function WorkspaceRootLayout() {
  return <RootLayout mode="workspace" />;
}

export const WorkspaceRootRouteAPI = Route;
