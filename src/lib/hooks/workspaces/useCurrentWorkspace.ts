import { useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks";
import { propEquals } from "@/lib/utils/objects/higherOrderFuncs";
import { Workspace } from "@/models/Workspace/types";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";
import { WorkspaceRootRouteAPI } from "@/routes/_auth/$workspaceSlug/route";

/**
 * Get the current workspace.
 * This requires that we be inside a workspace route (i.e. any route
 * within `/_auth/$workspaceSlug/`)
 * @returns The current workspace
 */
export function useCurrentWorkspace(): Workspace {
  const { workspaceSlug } = WorkspaceRootRouteAPI.useParams();
  const workspaceFromRoute = WorkspaceRootRouteAPI.useLoaderData();
  const [userWorkspaces, isLoading] =
    WorkspaceClient.useGetWorkspacesOfCurrentUser();
  const navigate = useNavigate();

  if (isLoading) {
    return workspaceFromRoute;
  }

  const userWorkspace = userWorkspaces?.find(propEquals("slug", workspaceSlug));

  if (!userWorkspace) {
    navigate({
      to: AppLinks.invalidWorkspace.to,
      search: {
        redirectReason: "Workspace not found or access was revoked",
      },
      replace: true,
    });
  }

  // we still return `workspaceFromRoute` even if `userWorkspace` is undefined
  // just so UI doesn't crash from an undefined type, while we're waiting for
  // the `navigate` redirect above to kick in
  return userWorkspace ?? workspaceFromRoute;
}
