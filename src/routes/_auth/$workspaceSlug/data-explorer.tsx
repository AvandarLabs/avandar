import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DataExplorerSearchSchema } from "@/views/DataExplorerApp/DataExplorerURLState";
import { DataExplorerApp } from "@/views/DataExplorerApp/DataExplorerApp";

export const Route = createFileRoute("/_auth/$workspaceSlug/data-explorer")({
  component: RouteComponent,
  validateSearch: DataExplorerSearchSchema,
});

function RouteComponent() {
  const urlSearch = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return <DataExplorerApp urlSearch={urlSearch} navigate={navigate} />;
}
