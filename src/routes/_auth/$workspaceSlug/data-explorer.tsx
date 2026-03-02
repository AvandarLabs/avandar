import { createFileRoute } from "@tanstack/react-router";
import { DataExplorerApp } from "@/views/DataExplorerApp";

export const Route = createFileRoute("/_auth/$workspaceSlug/data-explorer")({
  component: RouteComponent,
});

function RouteComponent() {
  return <DataExplorerApp />;
}
