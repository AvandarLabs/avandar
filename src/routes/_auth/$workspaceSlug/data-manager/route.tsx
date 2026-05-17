import { createFileRoute } from "@tanstack/react-router";
import { RouteMiddleware } from "@/utils/RouteMiddleware";
import { DataManagerApp } from "@/views/DataManagerApp/DataManagerApp";

export const Route = createFileRoute("/_auth/$workspaceSlug/data-manager")({
  beforeLoad: RouteMiddleware.BeforeLoad.checkUserPermissions({
    permissionKey: "data_sources__can_list_sources",
    appLabel: "Data Sources",
  }),
  component: DataManagerApp,
});
