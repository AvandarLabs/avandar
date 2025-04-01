import { createFileRoute } from "@tanstack/react-router";
import { DataExplorerApp } from "@/components/DataExplorerApp/DataExplorerApp";

export const Route = createFileRoute("/_auth/data-explorer")({
  component: RouteComponent,
});

function RouteComponent() {
  return <DataExplorerApp />;
}
