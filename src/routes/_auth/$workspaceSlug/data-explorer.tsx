import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RouteMiddleware } from "@/util/RouteMiddleware";
import { DataExplorerApp } from "@/views/DataExplorerApp/DataExplorerApp";
import { DataExplorerSearchSchema } from "@/views/DataExplorerApp/DataExplorerURLState";

export const Route = createFileRoute("/_auth/$workspaceSlug/data-explorer")({
  validateSearch: DataExplorerSearchSchema,
  component: RouteComponent,
  beforeLoad: RouteMiddleware.BeforeLoad.checkUserPermissions({
    permissionKey: "data_explorer__can_run_query",
    appLabel: "Data Explorer",
  }),
});

function RouteComponent() {
  const urlSearch = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return <DataExplorerApp urlSearch={urlSearch} navigate={navigate} />;
}
