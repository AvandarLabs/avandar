import { createFileRoute } from "@tanstack/react-router";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { GisApp } from "@/views/GisApp/GisApp";

export const Route = createFileRoute("/_auth/$workspaceSlug/map")({
  component: GisAppPage,
});

function GisAppPage() {
  const workspace = useCurrentWorkspace();
  return <GisApp workspaceId={workspace.id} />;
}
