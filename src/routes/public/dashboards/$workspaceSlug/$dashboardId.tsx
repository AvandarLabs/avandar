import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
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

    // The dashboardId URL is the canonical/stable URL (used for QR codes),
    // but if a vanity slug exists we send users there instead. Slugs are
    // globally unique among public dashboards so the vanity URL doesn't
    // need a workspace component.
    if (dashboard.slug) {
      throw redirect({
        to: "/d/$slug",
        params: { slug: dashboard.slug },
        replace: true,
      });
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
