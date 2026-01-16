import { createFileRoute } from "@tanstack/react-router";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { DataExplorerStore } from "@/components/DataExplorerApp/DataExplorerStore";
import { DashboardViewerView } from "@/views/DashboardApp/DashboardViewerView";
import type {
  DashboardId,
  DashboardRead,
} from "@/models/Dashboard/Dashboard.types";

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
    dashboard: DashboardRead | undefined;
  };

  return (
    <DataExplorerStore.Provider>
      <DashboardViewerView dashboard={dashboard} />
    </DataExplorerStore.Provider>
  );
}
