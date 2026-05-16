import {
  getGrantedPermissionKeysForAppRole,
  parseAppTypeFromPermissionKey,
} from "@/hooks/permissions/permissionCatalogUtils";
import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles";
import type { Permissions } from "$/models/Permissions/Permissions";

/**
 * Whether the current workspace member holds a catalog permission.
 *
 * @param permissionKey Derived permission id for one capability.
 */
export function useHasPermission(
  permissionKey: Permissions.PermissionKey,
): boolean {
  const [roles, isLoading] = useUserAppRoles();

  if (isLoading || roles === undefined) {
    return false;
  }

  const app = parseAppTypeFromPermissionKey(permissionKey);

  if (!app) {
    return false;
  }

  const roleForApp = roles[app];

  if (!roleForApp) {
    return false;
  }

  const granted = getGrantedPermissionKeysForAppRole({
    app,
    role: roleForApp,
  });

  return granted.has(permissionKey);
}
