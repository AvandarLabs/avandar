import { Loader } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { WorkspaceHomeView } from "@/views/WorkspaceHomeView";

export const Route = createFileRoute("/_auth/$workspaceSlug/")({
  component: WorkspaceHomePage,
});

function WorkspaceHomePage() {
  const { user } = Route.useRouteContext();
  const workspace = useCurrentWorkspace();

  if (!user) {
    return <Loader />;
  }

  return <WorkspaceHomeView workspace={workspace} />;
}
