import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceSettingsPage } from "@/views/WorkspaceSettingsPage/WorkspaceSettingsPage";

export const Route = createFileRoute("/_auth/$workspaceSlug/settings/$tabName")(
  {
    component: WorkspaceSettingsPage,
  },
);
