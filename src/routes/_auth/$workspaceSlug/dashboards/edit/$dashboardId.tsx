import { createFileRoute, notFound } from "@tanstack/react-router";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { DashboardEditorView } from "@/views/DashboardApp/DashboardEditorView/DashboardEditorView";
import type {
  DashboardId,
  DashboardRead,
} from "$/models/Dashboard/Dashboard.types";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/dashboards/edit/$dashboardId",
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
  component: DashboardEditorPage,
});

function DashboardEditorPage(): JSX.Element {
  const { workspaceSlug } = Route.useParams();
  const { dashboard } = Route.useLoaderData() as {
    dashboard: DashboardRead;
  };
  return (
    <DashboardEditorView dashboard={dashboard} workspaceSlug={workspaceSlug} />
  );
}
