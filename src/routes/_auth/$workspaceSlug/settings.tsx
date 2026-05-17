import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceSettingsPage } from "@/components/WorkspaceSettingsPage/WorkspaceSettingsPage";
import { RouteMiddleware } from "@/util/RouteMiddleware";

export const Route = createFileRoute("/_auth/$workspaceSlug/settings")({
  beforeLoad: RouteMiddleware.BeforeLoad.checkUserPermissions({
    permissionKey: "settings__can_manage_workspace_users",
    appLabel: "Workspace Settings",
  }),
  component: WorkspaceSettingsPage,
});
