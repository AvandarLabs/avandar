import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { AppLinks } from "@/config/AppLinks";
import { where } from "@/lib/utils/filters/filterBuilders";
import { propEquals } from "@/lib/utils/objects/higherOrderFuncs";
import { Workspace } from "@/models/Workspace/types";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";

export const Route = createFileRoute("/_auth/$workspaceSlug")({
  component: WorkspaceRootLayout,
  loader: async ({ params, context }): Promise<Workspace> => {
    const { queryClient } = context;
    const { workspaceSlug } = params;

    // use `ensureQueryData` so that we can load workspace immediately
    // if it's in the cache, even if the data is stale.
    // `useQuery` (which is called by our React components) will then
    // handle refetching if the data is indeed stale
    const workspaces = await WorkspaceClient.withCache(queryClient)
      .withEnsureQueryData()
      .getAll(where("slug", "eq", workspaceSlug));
    const workspaceToLoad = workspaces.find(propEquals("slug", workspaceSlug));
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
