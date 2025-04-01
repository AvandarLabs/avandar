import { createFileRoute } from "@tanstack/react-router";
import { DataImportApp } from "@/components/DataImportApp/DataImportApp";

export const Route = createFileRoute("/_auth/data-import")({
  component: RouteComponent,
});

function RouteComponent() {
  return <DataImportApp />;
}
