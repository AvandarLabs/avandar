import { createFileRoute, notFound } from "@tanstack/react-router";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { DashboardViewerView } from "@/views/DashboardApp/DashboardViewerView/DashboardViewerView";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type {
  DashboardId,
  DashboardRead,
} from "$/models/Dashboard/Dashboard.types";

/**
 * Auth-gated preview of a dashboard, rendered with the same viewer
 * component the public route uses. Lets the dashboard editor click "View"
 * to see the read-only experience before clicking "Publish". Bypasses the
 * `isPublic` gate because the route is only reachable by workspace members
 * with auth (the public route at `/public/dashboards/...` continues to
 * enforce `isPublic` so the public guarantee is not weakened).
 */
export const Route = createFileRoute(
  "/_auth/$workspaceSlug/dashboards/preview/$dashboardId",
)({
  loader: async ({ params }): Promise<{ dashboard: DashboardRead }> => {
    const dashboard = await DashboardClient.getById({
      id: params.dashboardId as DashboardId,
    });
    if (!dashboard) {
      throw notFound();
    }
    return { dashboard };
  },
  component: DashboardPreviewPage,
});

function DashboardPreviewPage(): JSX.Element {
  const { workspaceSlug } = Route.useParams();
  const { dashboard } = Route.useLoaderData() as {
    dashboard: DashboardRead;
  };
  return (
    <DataExplorerStateManager.Provider>
      <DashboardViewerView
        dashboard={dashboard}
        mode="preview"
        workspaceSlug={workspaceSlug}
      />
    </DataExplorerStateManager.Provider>
  );
}
