import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/data-manager/$datasetId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_auth/data-manager/$datasetId"!</div>;
}
