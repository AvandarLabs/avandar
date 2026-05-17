/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  AppType as AppTypeAlias,
  BuiltinPresetType as BuiltinPresetTypeAlias,
  PermissionKey as PermissionKeyAlias,
  RoleLevel as RoleLevelAlias,
  UserAppRolesList as UserAppRolesListAlias,
  UserAppRolesMatrix as UserAppRolesMatrixAlias,
} from "$/models/Permissions/Permissions.types.ts";

export { PermissionsModule as Permissions } from "$/models/Permissions/PermissionsModule/PermissionsModule.ts";

export namespace Permissions {
  export type AppType = AppTypeAlias;
  export type BuiltinPresetType = BuiltinPresetTypeAlias;

  /**
   * A PermissionKey is a string concatenation of an AppType and a capability.
   *
   * @example "data_sources__can_view_dataset"
   * @example "dashboards__can_view_dashboard"
   * */
  export type PermissionKey = PermissionKeyAlias;
  export type RoleLevel = RoleLevelAlias;
  export type UserAppRolesMatrix = UserAppRolesMatrixAlias;
  export type UserAppRolesList = UserAppRolesListAlias;
}
