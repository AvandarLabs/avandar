import { createFileRoute } from "@tanstack/react-router";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { DashboardViewerView } from "@/views/DashboardApp/DashboardViewerView/DashboardViewerView";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type {
  Dashboard,
  DashboardId,
} from "$/models/Dashboard/Dashboard.types";

export const Route = createFileRoute(
  "/public/dashboards/$workspaceSlug/$dashboardId",
)({
  loader: async ({ params }) => {
    const dashboard = await DashboardClient.getById({
      id: params.dashboardId as DashboardId,
    });

    return { dashboard };
  },
  component: DashboardViewerPage,
});

function DashboardViewerPage(): JSX.Element {
  const { dashboard } = Route.useLoaderData() as {
    dashboard: Dashboard | undefined;
  };

  return (
    <DataExplorerStateManager.Provider>
      <DashboardViewerView dashboard={dashboard} />
    </DataExplorerStateManager.Provider>
  );
}
