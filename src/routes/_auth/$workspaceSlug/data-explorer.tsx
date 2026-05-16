import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DataExplorerApp } from "@/views/DataExplorerApp/DataExplorerApp";
import { DataExplorerSearchSchema } from "@/views/DataExplorerApp/DataExplorerURLState";

export const Route = createFileRoute("/_auth/$workspaceSlug/data-explorer")({
  component: RouteComponent,
  validateSearch: DataExplorerSearchSchema,
});

function RouteComponent() {
  const urlSearch = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return <DataExplorerApp urlSearch={urlSearch} navigate={navigate} />;
}
