import { Workspace } from "./types";

const WORKSPACE_ROUTE = "/$workspaceSlug" as const;
type WorkspaceRoute = typeof WORKSPACE_ROUTE;

export function getWorkspaceLinkProps(workspaceOrSlug: string | Workspace): {
  to: WorkspaceRoute;
  params: {
    workspaceSlug: string;
  };
} {
  const workspaceSlug =
    typeof workspaceOrSlug === "string" ? workspaceOrSlug : (
      workspaceOrSlug.slug
    );

  return {
    to: WORKSPACE_ROUTE,
    params: {
      workspaceSlug,
    },
  };
}
