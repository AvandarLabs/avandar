import type { UserAppRolesMatrix } from "$/models/Permissions/Permissions.types";

import { Permissions } from "$/models/Permissions/Permissions";
import { PermissionsClient } from "@/clients/permissions/PermissionsClient";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

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

  const [data, isLoading] = PermissionsClient.useGetMemberAppRoles({
    workspaceId: workspace.id,
    userId: user?.id,
    useQueryOptions: {
      enabled: workspaceAndUserLoaded,
      staleTime: Infinity,
    },
  });

  const roles = !workspaceAndUserLoaded
    ? undefined
    : isLoading
      ? undefined
      : (data ?? Permissions.RolesMatrix.Builtins.EmptyMatrix);

  return [roles, workspaceAndUserLoaded && isLoading] as const;
}
