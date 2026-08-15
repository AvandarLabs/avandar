import { createFileRoute } from "@tanstack/react-router";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DashboardListView } from "@/views/DashboardApp/DashboardListView/DashboardListView";

export const Route = createFileRoute("/_auth/$workspaceSlug/dashboards/")({
  component: DashboardsPage,
});

function DashboardsPage(): JSX.Element {
  const { workspaceSlug } = Route.useParams();
  const workspace = useCurrentWorkspace();

  // No `owner_id` filter: RLS decides what this user may see, which is what
  // makes a dashboard shared with you appear in your list at all. See the P3
  // design, section 6.
  const [dashboards] = DashboardClient.useGetAll({
    where: { workspace_id: { eq: workspace.id } },
  });

  return (
    <DashboardListView
      dashboards={dashboards ?? []}
      workspaceSlug={workspaceSlug}
    />
  );
}
