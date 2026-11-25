import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

/**
 * Whether the current user may add a dataset to the workspace: its owner
 * or a Settings admin, the same people `rpc_datasets__add_dataset` allows
 * through `util__can_manage_workspace_settings`. Used where a feature
 * creates a dataset on the user's behalf, such as a linked dataset.
 */
export function useCanCreateDatasets(): boolean {
  const workspace = useCurrentWorkspace();
  const user = useCurrentUser();
  const isSettingsAdmin = useHasPermission(
    "settings__can_manage_workspace_users",
  );
  return isSettingsAdmin || (!!user && workspace.ownerId === user.id);
}
