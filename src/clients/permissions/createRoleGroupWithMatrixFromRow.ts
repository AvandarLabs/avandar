import { Permissions } from "$/models/Permissions/Permissions";
import type {
  AppType,
  RoleLevel,
  UserAppRolesMatrix,
} from "$/models/Permissions/Permissions.types";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Role group identity and its complete application permission matrix. */
export type RoleGroupWithMatrix = {
  id: string;
  workspaceId: Workspace.Id;
  name: string;
  isBuiltin: boolean;
  roleMatrix: UserAppRolesMatrix;
};

/** Converts a database role-group row into its client model. */
export function createRoleGroupWithMatrixFromRow(row: {
  id: string;
  workspace_id: string;
  name: string;
  is_builtin: boolean;
  role_group_app_roles: Array<{ app: AppType; role: RoleLevel }> | null;
}): RoleGroupWithMatrix {
  const rows = row.role_group_app_roles ?? [];
  return {
    id: row.id,
    workspaceId: row.workspace_id as Workspace.Id,
    name: row.name,
    isBuiltin: row.is_builtin,
    roleMatrix: Permissions.RolesMatrix.rowsToUserAppRolesMatrix(
      rows.map((r) => {
        return { app: r.app, role: r.role };
      }),
    ),
  };
}
