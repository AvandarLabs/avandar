import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/entity-designer")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_auth/entity-designer"!</div>;
}
