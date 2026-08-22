import type { Dashboard } from "$/models/Dashboard/Dashboard";

import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { UserClient } from "@/clients/UserClient";
import { DashboardEditorView } from "@/views/DashboardApp/DashboardEditorView/DashboardEditorView";

/** Renders the dashboard editor for users with at least editor access. */
export const Route = createFileRoute(
  "/_auth/$workspaceSlug/dashboards/edit/$dashboardId",
)({
  beforeLoad: async ({ params }) => {
    const canEdit = await UserClient.canAccessResource({
      resourceType: "dashboard",
      resourceId: params.dashboardId,
      minRole: "editor",
    });

    if (!canEdit) {
      throw redirect({
        to: "/$workspaceSlug/dashboards/preview/$dashboardId",
        params: {
          workspaceSlug: params.workspaceSlug,
          dashboardId: params.dashboardId,
        },
        replace: true,
      });
    }
  },
  loader: async ({ params }) => {
    const dashboard = await DashboardClient.getById({
      id: params.dashboardId as Dashboard.Id,
    });

    if (!dashboard) {
      throw notFound();
    }

    return { dashboard };
  },
  component: DashboardEditorPage,
});

function DashboardEditorPage(): JSX.Element {
  const { workspaceSlug } = Route.useParams();
  const { dashboard } = Route.useLoaderData();
  return (
    <DashboardEditorView dashboard={dashboard} workspaceSlug={workspaceSlug} />
  );
}
