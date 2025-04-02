import { createFileRoute } from "@tanstack/react-router";
import { DataManagerApp } from "@/components/DataManagerApp/DataManagerApp";

export const Route = createFileRoute("/_auth/data-manager/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <DataManagerApp />;
}
