import { Permissions } from "$/models/Permissions/Permissions";
import type {
  PermissionKey,
  UserAppRolesMatrix,
} from "$/models/Permissions/Permissions";

/**
 * Builds a stand-in for `useHasPermission` that answers from an app-role
 * matrix, so a test grants roles rather than listing permission keys. Apps
 * missing from `roles` have no role.
 */
export function makeHasPermissionFromAppRoles(
  roles: Partial<UserAppRolesMatrix>,
): (permissionKey: PermissionKey) => boolean {
  const rolesMatrix = {
    ...Permissions.RolesMatrix.Builtins.EmptyMatrix,
    ...roles,
  };
  return (permissionKey) => {
    return Permissions.rolesMatrixHasPermission({
      roles: rolesMatrix,
      permissionKey,
    });
  };
}
