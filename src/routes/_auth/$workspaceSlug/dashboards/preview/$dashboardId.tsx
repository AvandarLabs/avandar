import { createFileRoute, notFound } from "@tanstack/react-router";

import { Dashboard } from "$/models/Dashboard/Dashboard";
import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { UserClient } from "@/clients/UserClient";
import { DashboardAccessDeniedView } from "@/views/DashboardApp/DashboardViewerView/DashboardAccessDeniedView/DashboardAccessDeniedView";
import { DashboardViewerView } from "@/views/DashboardApp/DashboardViewerView/DashboardViewerView";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";

/**
 * Renders an authenticated dashboard preview. The editor return control is
 * available only to users who currently have at least editor access.
 */
export const Route = createFileRoute(
  "/_auth/$workspaceSlug/dashboards/preview/$dashboardId",
)({
  loader: async ({ params }) => {
    const dashboard = await DashboardClient.getById({
      id: params.dashboardId as Dashboard.Id,
    });
    if (!dashboard) {
      throw notFound();
    }

    const canEdit = await UserClient.canAccessResource({
      resourceType: "dashboard",
      resourceId: params.dashboardId,
      minRole: "editor",
    });

    // A draft is not ready for anyone but the people who can edit it, so a
    // viewer may open a dashboard only once it is published.
    const isAccessDenied = !canEdit && dashboard.visibility === "draft";

    return { dashboard, canEdit, isAccessDenied };
  },
  component: DashboardPreviewPage,
});

function DashboardPreviewPage() {
  const { workspaceSlug } = Route.useParams();
  const { dashboard, canEdit, isAccessDenied } = Route.useLoaderData();
  if (isAccessDenied) {
    return <DashboardAccessDeniedView />;
  }

  return (
    <DataExplorerStateManager.Provider>
      <DashboardViewerView
        dashboard={dashboard}
        mode="preview"
        workspaceSlug={workspaceSlug}
        canEdit={canEdit}
      />
    </DataExplorerStateManager.Provider>
  );
}
