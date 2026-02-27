import { createFileRoute } from "@tanstack/react-router";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DashboardListView } from "@/views/DashboardApp/DashboardListView";

export const Route = createFileRoute("/_auth/$workspaceSlug/dashboards/")({
  component: DashboardsPage,
});

function DashboardsPage(): JSX.Element {
  const { workspaceSlug } = Route.useParams();
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();

  const dashboardsWhere =
    userProfile ?
      {
        workspace_id: { eq: workspace.id },
        owner_id: { eq: userProfile.userId },
      }
    : undefined;

  const [dashboards] = DashboardClient.useGetAll({
    where: dashboardsWhere,
    useQueryOptions: {
      enabled: dashboardsWhere !== undefined,
    },
  });

  return (
    <DashboardListView
      dashboards={dashboards ?? []}
      workspaceSlug={workspaceSlug}
    />
  );
}
