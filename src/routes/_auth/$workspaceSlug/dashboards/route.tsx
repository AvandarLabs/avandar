import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RouteMiddleware } from "@/utils/RouteMiddleware";

export const Route = createFileRoute("/_auth/$workspaceSlug/dashboards")({
  beforeLoad: RouteMiddleware.BeforeLoad.checkUserPermissions({
    permissionKey: "dashboards__can_view_dashboard",
    appLabel: "Dashboards",
  }),
  component: DashboardsLayout,
});

function DashboardsLayout(): JSX.Element {
  return <Outlet />;
}
