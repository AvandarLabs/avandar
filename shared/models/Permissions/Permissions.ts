/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  AppType as AppTypeAlias,
  PermissionCatalog as PermissionCatalogAlias,
  PermissionKey as PermissionKeyAlias,
  RoleLevel as RoleLevelAlias,
} from "$/models/Permissions/Permissions.types.ts";

export { PermissionsModule as Permissions } from "$/models/Permissions/PermissionsModule.ts";

export namespace Permissions {
  export type AppType = AppTypeAlias;
  export type PermissionCatalog = PermissionCatalogAlias;
  export type PermissionKey = PermissionKeyAlias;
  export type RoleLevel = RoleLevelAlias;
}
