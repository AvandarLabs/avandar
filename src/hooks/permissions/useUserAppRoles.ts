import { QueryKey } from "@tanstack/react-query";
import { UserId } from "$/models/User/User.types";
import { WorkspaceId } from "$/models/Workspace/Workspace.types";
import { UserClient } from "@/clients/UserClient";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { UserAppRolesMatrix } from "$/models/Permissions/Permissions.types";

/**
 * Empty record used while roles are loading or workspace/user is missing.
 */
const EMPTY_ROLES_RECORD: UserAppRolesMatrix = {
  data_sources: undefined,
  data_explorer: undefined,
  dashboards: undefined,
  settings: undefined,
} as const;

/**
 * @param workspaceId Workspace id.
 * @param userId Auth user id.
 */
export function userAppRolesQueryKey(params: {
  workspaceId: WorkspaceId;
  userId: UserId | undefined;
}): QueryKey {
  return UserClient.QueryKeys.getUserAppRoles({
    workspaceId: params.workspaceId,
    userId: params.userId,
  });
}

/**
 * Loads per-app roles for the signed-in user in the current workspace.
 *
 * @returns Tuple of roles (undefined while loading) and loading flag.
 */
export function useUserAppRoles(): readonly [
  userAppRoles: UserAppRolesMatrix | undefined,
  isLoading: boolean,
] {
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();
  const workspaceAndUserLoaded = !!workspace.id && !!user?.id;

  const [data, isLoading] = UserClient.useGetUserAppRoles({
    workspaceId: workspace.id,
    userId: user?.id,
    useQueryOptions: {
      enabled: workspaceAndUserLoaded,
      staleTime: Infinity,
    },
  });

  const roles =
    !workspaceAndUserLoaded ? undefined
    : isLoading ? undefined
    : (data ?? EMPTY_ROLES_RECORD);

  return [roles, workspaceAndUserLoaded && isLoading] as const;
}
