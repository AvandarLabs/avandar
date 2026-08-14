import { createFileRoute } from "@tanstack/react-router";
import { appLabel } from "$/copy/appLabel";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { RouteMiddleware } from "@/utils/RouteMiddleware";
import { GisApp } from "@/views/GisApp/GisApp";

export const Route = createFileRoute("/_auth/$workspaceSlug/map")({
  component: function GisAppPage() {
    const workspace = useCurrentWorkspace();
    return <GisApp workspaceId={workspace.id} />;
  },
  beforeLoad: RouteMiddleware.BeforeLoad.checkUserPermissions({
    permissionKey: "gis__can_view_map",
    appLabel: () => {
      return appLabel("gis");
    },
  }),
});
