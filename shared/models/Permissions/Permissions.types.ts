/**
 * Workspace application surface (matches `public.app_type`).
 */
export type AppType =
  | "data_sources"
  | "data_explorer"
  | "dashboards"
  | "settings";

/**
 * Role ordering matches Postgres enum `public.role_level`.
 */
export type RoleLevel = "viewer" | "editor" | "admin";

/**
 * Derived UI gate key (`${app}__${capability}`). SQL still enforces
 * `role_level` only.
 */
export type PermissionKey = `${AppType}__${string}`;

/**
 * Full catalog: each app defines permission keys granted at each role tier.
 */
export type PermissionCatalog = {
  readonly [A in AppType]: {
    readonly [R in RoleLevel]: readonly PermissionKey[];
  };
};
