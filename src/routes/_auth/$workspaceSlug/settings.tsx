import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceSettingsPage } from "@/components/WorkspaceSettingsPage";

export const Route = createFileRoute("/_auth/$workspaceSlug/settings")({
  component: WorkspaceSettingsPage,
});
