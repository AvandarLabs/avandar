import { createFileRoute, Outlet } from "@tanstack/react-router";
import { appLabel } from "$/copy/appLabel";
import { RouteMiddleware } from "@/utils/RouteMiddleware";

/** Guards and renders the authenticated GIS route subtree. */
export const Route = createFileRoute("/_auth/$workspaceSlug/map")({
  beforeLoad: RouteMiddleware.BeforeLoad.checkUserPermissions({
    permissionKey: "gis__can_view_map",
    appLabel: () => {
      return appLabel("gis");
    },
    resourceFallback: {
      type: "map",
      idParam: "mapId",
      minRole: "viewer",
    },
  }),
  component: MapLayout,
});

function MapLayout(): JSX.Element {
  return <Outlet />;
}
