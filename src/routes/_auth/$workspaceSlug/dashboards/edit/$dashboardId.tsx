import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { DashboardEditorView } from "@/views/DashboardApp/DashboardEditorView";
import type {
  DashboardId,
  DashboardRead,
} from "@/models/Dashboard/Dashboard.types";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/dashboards/edit/$dashboardId",
)({
  loader: async ({ params }) => {
    const dashboard = await DashboardClient.getById({
      id: params.dashboardId as DashboardId,
    });

    return { dashboard };
  },
  component: DashboardEditorPage,
});

function DashboardEditorPage(): JSX.Element {
  const { dashboard } = Route.useLoaderData() as {
    dashboard: DashboardRead | undefined;
  };

  return (
    <Container py="xl">
      <DashboardEditorView dashboard={dashboard} />
    </Container>
  );
}
