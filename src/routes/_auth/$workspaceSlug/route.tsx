import { createFileRoute, redirect } from "@tanstack/react-router";
import { propEq } from "@utils/objects/hofs/propEq/propEq";
import { Workspace } from "$/models/Workspace/Workspace";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { RootLayout } from "@/components/common/layouts/RootLayout/RootLayout";
import { AppLinks } from "@/config/AppLinks";

export const Route = createFileRoute("/_auth/$workspaceSlug")({
  component: WorkspaceRootLayout,
  loader: async ({
    params,
    context,
  }): Promise<Workspace.WithSubscription | undefined> => {
    const { queryClient } = context;
    const { workspaceSlug } = params;
    const workspaces = await WorkspaceClient.withCache(queryClient)
      .withFetchQuery()
      .getWorkspacesOfCurrentUser();
    const workspaceToLoad = workspaces.find(propEq("slug", workspaceSlug));
    if (!workspaceToLoad) {
      throw redirect({ to: AppLinks.invalidWorkspace.to });
    }

    // We've fetched the workspace, but we never really consume it by using
    // the route's `useLoaderData()` API. We only used this `loader` function
    // in order to load the workspace into the QueryClient cache. All our
    // react components will use `useQuery` under the hood which will
    // fetch from this same cache, but will make sure we don't show
    // any stale data.
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
