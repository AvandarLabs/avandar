import { createFileRoute, notFound } from "@tanstack/react-router";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { DashboardViewerView } from "@/views/DashboardApp/DashboardViewerView/DashboardViewerView";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";

export const Route = createFileRoute(
  "/public/dashboards/$workspaceSlug/$dashboardId",
)({
  loader: async ({ params }) => {
    const dashboard = await DashboardClient.getById({
      id: params.dashboardId as DashboardId,
    });

    if (!dashboard) {
      throw notFound();
    }

    return { dashboard };
  },
  component: DashboardViewerPage,
});

function DashboardViewerPage(): JSX.Element {
  const { dashboard } = Route.useLoaderData();

  return (
    <DataExplorerStateManager.Provider>
      <DashboardViewerView dashboard={dashboard} />
    </DataExplorerStateManager.Provider>
  );
}
