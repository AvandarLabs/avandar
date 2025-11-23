import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { AppLinks } from "@/config/AppLinks";
import { propEq } from "@/lib/utils/objects/higherOrderFuncs";
import { WorkspaceWithSubscription } from "@/models/Workspace/Workspace.types";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";

export const Route = createFileRoute("/_auth/$workspaceSlug")({
  component: WorkspaceRootLayout,
  loader: async ({ params, context }): Promise<WorkspaceWithSubscription> => {
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
  return <AppLayout mode="workspace" />;
}

export const WorkspaceRootRouteAPI = Route;
