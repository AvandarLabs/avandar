import { createFileRoute } from "@tanstack/react-router";
import { RouteMiddleware } from "@/utils/RouteMiddleware";
import {
  buildDataExplorerStateFromUrl,
  DataExplorerSearchSchema,
} from "@/views/DataExplorerApp/buildDataExplorerStateFromUrl/buildDataExplorerStateFromUrl";
import { DataExplorerApp } from "@/views/DataExplorerApp/DataExplorerApp";

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
  const dataExplorerUrlState = buildDataExplorerStateFromUrl(urlSearch);
  return <DataExplorerApp initialUrlState={dataExplorerUrlState} />;
}
