import { createFileRoute } from "@tanstack/react-router";
import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DashboardListView } from "@/views/DashboardApp/DashboardListView/DashboardListView";

export const Route = createFileRoute("/_auth/$workspaceSlug/dashboards/")({
  component: DashboardsPage,
});

function DashboardsPage(): JSX.Element {
  const { workspaceSlug } = Route.useParams();
  const workspace = useCurrentWorkspace();

  // No `owner_id` filter: RLS decides what this user may see, which is what
  // makes a dashboard shared with you appear in your list at all.
  //
  // The `workspace_id` filter is load-bearing, not cosmetic. RLS alone will
  // not scope this list: `util__auth_user_may_select_dashboard` returns true
  // on `is_public` BEFORE it looks at workspace membership, so dropping this
  // filter would list every public dashboard in the entire instance here.
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
