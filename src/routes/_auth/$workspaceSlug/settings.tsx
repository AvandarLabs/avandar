import { createFileRoute } from "@tanstack/react-router";
import { RouteMiddleware } from "@/utils/RouteMiddleware";
import { WorkspaceSettingsPage } from "@/views/WorkspaceSettingsPage/WorkspaceSettingsPage";

export const Route = createFileRoute("/_auth/$workspaceSlug/settings")({
  beforeLoad: RouteMiddleware.BeforeLoad.checkUserPermissions({
    permissionKey: "settings__can_manage_workspace_users",
    appLabel: "Workspace Settings",
  }),
  component: WorkspaceSettingsPage,
});
