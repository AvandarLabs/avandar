import { buildInitialCustomRoleGroupName } from "$/models/Permissions/PermissionsModule/buildInitialCustomRoleGroupName/buildInitialCustomRoleGroupName.ts";
import { PermissionRegistry } from "$/models/Permissions/PermissionsModule/PermissionRegistry.ts";
import {
  BUILTIN_ROLE_GROUP_NAMES,
  RESTRICTABLE_APPS,
} from "$/models/Permissions/PermissionsModule/RolesMatrixModule/preset-role-matrices.ts";
import { RolesMatrixModule } from "$/models/Permissions/PermissionsModule/RolesMatrixModule/RolesMatrixModule.ts";
import type {
  AppType,
  PermissionKey,
  RoleLevel,
  UserAppRolesMatrix,
} from "$/models/Permissions/Permissions.types.ts";

/**
 * Workspace permissions: UI catalog plus workspace role-matrix helpers.
 *
 * @property PermissionCatalog Frozen keys per `(app_type, role_level)`.
 */
export const PermissionsModule = {
  RestrictableApps: RESTRICTABLE_APPS,
  BuiltinRoleGroupNames: BUILTIN_ROLE_GROUP_NAMES,
  RolesMatrix: RolesMatrixModule,

  /**
   * Picks a unique `Custom Role Group N` for a workspace. Starts at
   * `(count of non-built-in role_groups in workspace) + 1`, then increments `N`
   * while that name is already taken (any group in the workspace).
   */
  buildInitialCustomRoleGroupName,

  PermissionCatalog: PermissionRegistry,

  /**
   * Returns every permission key granted to `role` in `app`.
   *
   * @param options.app Workspace app surface.
   * @param options.role Effective role tier for that app.
   */
  getPermissionsForAppRole(options: {
    app: AppType;
    role: RoleLevel;
  }): ReadonlySet<PermissionKey> {
    const catalog = PermissionRegistry[options.app];
    const ordered: readonly RoleLevel[] = ["viewer", "editor", "admin"];
    const maxIdx = ordered.indexOf(options.role);

    return new Set(
      ordered.slice(0, maxIdx + 1).flatMap((tier) => {
        return [...catalog[tier]];
      }),
    );
  },

  /**
   * Resolves which app a permission key belongs to.
   *
   * @returns Matching app, or undefined when the prefix is unknown.
   */
  parseAppTypeFromPermissionKey(
    permissionKey: PermissionKey,
  ): AppType | undefined {
    return RESTRICTABLE_APPS.find((app) => {
      return permissionKey.startsWith(`${app}__`);
    });
  },

  /**
   * Whether a member's app-role matrix includes a catalog permission key.
   *
   * @param options.roles Per-app role levels for the member.
   * @param options.permissionKey Catalog permission key to check.
   */
  rolesMatrixHasPermission(options: {
    roles: UserAppRolesMatrix;
    permissionKey: PermissionKey;
  }): boolean {
    const app = PermissionsModule.parseAppTypeFromPermissionKey(
      options.permissionKey,
    );
    if (!app) {
      return false;
    }

    const roleForApp = options.roles[app];
    if (!roleForApp) {
      return false;
    }

    const granted = PermissionsModule.getPermissionsForAppRole({
      app,
      role: roleForApp,
    });

    return granted.has(options.permissionKey);
  },
};
