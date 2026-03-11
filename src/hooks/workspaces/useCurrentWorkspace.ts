import { useNavigate } from "@tanstack/react-router";
import { propEq } from "@utils/objects/hofs/propEq/propEq";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AppLinks } from "@/config/AppLinks";
import { WorkspaceRootRouteAPI } from "@/routes/_auth/$workspaceSlug/route";
import { Logger } from "@/utils/Logger";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Get the current workspace.
 * This requires that we be inside a workspace route (i.e. any route
 * within `/_auth/$workspaceSlug/`)
 * @returns The current workspace
 */
export function useCurrentWorkspace(): Workspace.WithSubscription {
  const { workspaceSlug } = WorkspaceRootRouteAPI.useParams();
  const workspaceFromRoute = WorkspaceRootRouteAPI.useLoaderData();
  const [userWorkspaces, _, { isFetching, isSuccess }] =
    WorkspaceClient.useGetWorkspacesOfCurrentUser({
      useQueryOptions: {
        // never consider this stale, we will need to manually
        // invalidate this query
        staleTime: Infinity,
      },
    });
  const navigate = useNavigate();

  // after a fetch, the query cache is the source of truth if
  // we find a workspace with the necessary slug
  const workspaceFromCache =
    isSuccess ? userWorkspaces?.find(propEq("slug", workspaceSlug)) : undefined;

  if (workspaceFromCache) {
    return workspaceFromCache;
  }

  // During a fetch or on initial load, the loader data from the
  // WorkspaceRootRouteAPI is our best source of truth
  if (isFetching && workspaceFromRoute) {
    return workspaceFromRoute;
  }

  // If the query is done but the workspace isn't found, the user
  // lost access to this workspace
  if (isSuccess && !workspaceFromCache) {
    navigate({
      to: AppLinks.invalidWorkspace.to,
      search: {
        redirectReason: "NOT_FOUND_OR_ACCESS_REVOKED",
      },
      replace: true,
    });
  }

  // Fallback to prevent a page crash
  if (!workspaceFromRoute) {
    Logger.error("Workspace could not load. Likely a dev-time HMR issue.");
    throw new Error("Workspace could not load");
  }

  return workspaceFromCache ?? workspaceFromRoute;
}
