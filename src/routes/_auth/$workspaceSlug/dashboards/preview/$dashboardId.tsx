import { createFileRoute, notFound } from "@tanstack/react-router";
import { Dashboard } from "$/models/Dashboard/Dashboard";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { UserClient } from "@/clients/UserClient";
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

    return { dashboard, canEdit };
  },
  component: DashboardPreviewPage,
});

function DashboardPreviewPage() {
  const { workspaceSlug } = Route.useParams();
  const { dashboard, canEdit } = Route.useLoaderData();
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
