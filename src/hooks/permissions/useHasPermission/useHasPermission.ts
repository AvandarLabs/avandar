import { Permissions } from "$/models/Permissions/Permissions";
import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles/useUserAppRoles";
import type { PermissionKey } from "$/models/Permissions/Permissions";

/**
 * Whether the current user has the given permission.
 *
 * @param permissionKey Permission key for one capability in an app.
 */
export function useHasPermission(permissionKey: PermissionKey): boolean {
  const [roles, isLoading] = useUserAppRoles();
  if (isLoading || roles === undefined) {
    return false;
  }
  return Permissions.rolesMatrixHasPermission({ roles, permissionKey });
}
