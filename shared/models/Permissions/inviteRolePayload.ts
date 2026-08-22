import { Permissions } from "$/models/Permissions/Permissions.ts";
import type {
  AppType,
  RoleLevel,
  UserAppRolesMatrix,
} from "$/models/Permissions/Permissions.types.ts";

export type InviteRoleGroupRef = {
  id: string;
  name: string;
  isBuiltin: boolean;
  roleMatrix: UserAppRolesMatrix;
};

/**
 * Resolves `role_group_id` and `role_overrides` for a workspace invite from a
 * target matrix and the workspace role-group catalog.
 */
export function buildWorkspaceInviteRolePayload(
  matrix: UserAppRolesMatrix,
  roleGroups: readonly InviteRoleGroupRef[],
): {
  roleGroupId: string;
  roleOverrides: Array<{ app: AppType; role: RoleLevel }>;
} {
  const match = roleGroups.find((group) => {
    return Permissions.RolesMatrix.areRoleMatricesEqual(
      group.roleMatrix,
      matrix,
    );
  });
  const globalViewer = roleGroups.find((g) => {
    return g.name === "Global Viewer" && g.isBuiltin;
  });
  if (!globalViewer) {
    throw new Error("Global Viewer role group is missing.");
  }
  if (match) {
    return {
      roleGroupId: match.id,
      roleOverrides: [],
    };
  }
  const base = Permissions.RolesMatrix.Builtins.GlobalViewer;
  return {
    roleGroupId: globalViewer.id,
    roleOverrides: Permissions.RolesMatrix.diffBaseMatrixWithOverrides(
      base,
      matrix,
    ),
  };
}
