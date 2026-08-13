import { createFileRoute } from "@tanstack/react-router";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { GISApp } from "@/views/GISApp/GISApp";

export const Route = createFileRoute("/_auth/$workspaceSlug/map")({
  component: GISAppPage,
});

function GISAppPage() {
  const workspace = useCurrentWorkspace();
  return <GISApp workspaceId={workspace.id} />;
}
