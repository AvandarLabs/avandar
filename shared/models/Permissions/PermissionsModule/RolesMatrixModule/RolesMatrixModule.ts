import type {
  AppType,
  RoleLevel,
  UserAppRolesList,
  UserAppRolesMatrix,
} from "$/models/Permissions/Permissions.types.ts";

import {
  BUILTIN_GLOBAL_ADMIN_MATRIX,
  BUILTIN_GLOBAL_EDITOR_MATRIX,
  BUILTIN_GLOBAL_VIEWER_MATRIX,
  BUILTIN_ROLE_GROUP_NAMES,
  EMPTY_USER_APP_ROLES_MATRIX,
  RESTRICTABLE_APPS,
} from "$/models/Permissions/PermissionsModule/RolesMatrixModule/preset-role-matrices.ts";

export const RolesMatrixModule = {
  Builtins: {
    EmptyMatrix: EMPTY_USER_APP_ROLES_MATRIX,
    GlobalAdmin: BUILTIN_GLOBAL_ADMIN_MATRIX,
    GlobalEditor: BUILTIN_GLOBAL_EDITOR_MATRIX,
    GlobalViewer: BUILTIN_GLOBAL_VIEWER_MATRIX,
  },

  /**
   * Maps `role_group_app_roles` rows to a `UserAppRolesMatrix`.
   */
  rowsToUserAppRolesMatrix: (
    rows: ReadonlyArray<{ app: AppType; role: RoleLevel }>,
  ): UserAppRolesMatrix => {
    const empty = { ...EMPTY_USER_APP_ROLES_MATRIX } as UserAppRolesMatrix;
    rows.forEach((row) => {
      empty[row.app] = row.role;
    });
    return empty;
  },

  /**
   * Merges override tuples onto a base matrix (later wins on duplicate apps).
   */
  applyRoleOverridesToMatrix(
    base: UserAppRolesMatrix,
    overrides: ReadonlyArray<{ app: AppType; role: RoleLevel }>,
  ): UserAppRolesMatrix {
    const newMatrix: UserAppRolesMatrix = { ...base };
    overrides.forEach((override) => {
      newMatrix[override.app] = override.role;
    });
    return newMatrix;
  },

  /**
   * Serializes a matrix to rows for `role_group_app_roles` inserts.
   */
  userAppRolesMatrixToRows(
    userRolesMatrix: UserAppRolesMatrix,
  ): UserAppRolesList {
    return RESTRICTABLE_APPS.filter((app) => {
      return userRolesMatrix[app] !== undefined;
    }).map((app) => {
      return { app, role: userRolesMatrix[app]! };
    });
  },

  /**
   * @returns True when both records assign the same role per app (including
   *   undefined).
   */
  areRoleMatricesEqual(
    userRolesA: UserAppRolesMatrix,
    userRolesB: UserAppRolesMatrix,
  ): boolean {
    return RESTRICTABLE_APPS.every((app) => {
      return userRolesA[app] === userRolesB[app];
    });
  },

  /**
   * Returns the role matrix for a built-in role group name, or undefined if
   * unknown.
   */
  roleMatrixFromBuiltinRoleGroupName(
    name: string,
  ): UserAppRolesMatrix | undefined {
    if (name === BUILTIN_ROLE_GROUP_NAMES.globalAdmin) {
      return BUILTIN_GLOBAL_ADMIN_MATRIX;
    }
    if (name === BUILTIN_ROLE_GROUP_NAMES.globalEditor) {
      return BUILTIN_GLOBAL_EDITOR_MATRIX;
    }
    if (name === BUILTIN_ROLE_GROUP_NAMES.globalViewer) {
      return BUILTIN_GLOBAL_VIEWER_MATRIX;
    }
    return undefined;
  },

  /**
   * Diffs two role matrices and returns the "overrides" (i.e. the roles
   * in `target` that differ from `base`).
   */
  diffBaseMatrixWithOverrides(
    baseRoles: UserAppRolesMatrix,
    targetRoles: UserAppRolesMatrix,
  ): Array<{ app: AppType; role: RoleLevel }> {
    const out: Array<{ app: AppType; role: RoleLevel }> = [];
    for (const app of RESTRICTABLE_APPS) {
      if (baseRoles[app] === targetRoles[app]) {
        continue;
      }
      if (targetRoles[app] !== undefined) {
        out.push({ app, role: targetRoles[app]! });
      }
    }
    return out;
  },

  /**
   * Maps a matrix to a compact preset id for the settings UI segmented control.
   */
  roleGroupPresetTypeFromRoleMatrix(
    userRoleMatrix: UserAppRolesMatrix,
  ): "global_admin" | "global_editor" | "global_viewer" | "custom" {
    if (
      RolesMatrixModule.areRoleMatricesEqual(
        userRoleMatrix,
        BUILTIN_GLOBAL_ADMIN_MATRIX,
      )
    ) {
      return "global_admin";
    }
    if (
      RolesMatrixModule.areRoleMatricesEqual(
        userRoleMatrix,
        BUILTIN_GLOBAL_EDITOR_MATRIX,
      )
    ) {
      return "global_editor";
    }
    if (
      RolesMatrixModule.areRoleMatricesEqual(
        userRoleMatrix,
        BUILTIN_GLOBAL_VIEWER_MATRIX,
      )
    ) {
      return "global_viewer";
    }
    return "custom";
  },

  /**
   * Matrix for a built-in preset segment (not used for `custom`).
   */
  roleMatrixFromPresetType(
    presetType: "global_admin" | "global_editor" | "global_viewer",
  ): UserAppRolesMatrix {
    if (presetType === "global_admin") {
      return BUILTIN_GLOBAL_ADMIN_MATRIX;
    }
    if (presetType === "global_editor") {
      return BUILTIN_GLOBAL_EDITOR_MATRIX;
    }
    return BUILTIN_GLOBAL_VIEWER_MATRIX;
  },
};
