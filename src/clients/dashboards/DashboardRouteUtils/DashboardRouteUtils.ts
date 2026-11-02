import { AuthClient } from "@/clients/AuthClient/AuthClient";
import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import type { IDashboardRouteUtils } from "@/clients/dashboards/DashboardRouteResolver/DashboardRouteResolver";

/** Binds dashboard viewer-route reads to authenticated application clients. */
export const DashboardRouteUtils: IDashboardRouteUtils = {
  getById: async (id) => {
    return await DashboardClient.getById({ id });
  },
  findBySlug: async ({ slug, visibility, workspaceId }) => {
    return await DashboardClient.getAll({
      where: {
        slug: { eq: slug },
        visibility: { eq: visibility },
        ...(workspaceId === undefined
          ? {}
          : { workspace_id: { eq: workspaceId } }),
      },
    });
  },
  getViewerWorkspaces: async () => {
    return await WorkspaceClient.getWorkspacesOfCurrentUser();
  },
  isAuthenticated: async () => {
    const session = await AuthClient.getCurrentSession();
    return session?.user !== undefined;
  },
};
