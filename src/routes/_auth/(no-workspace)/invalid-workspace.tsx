import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/(no-workspace)/invalid-workspace")(
  {
    component: InvalidWorkspacePage,
  },
);

function InvalidWorkspacePage() {
  return <div>Hello "/_auth/invalid-workspace"!</div>;
}
