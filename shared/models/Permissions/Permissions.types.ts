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
 * Per-app role for the current user in one workspace, derived from
 * `workspace_memberships.role_group_id` and `role_group_app_roles`.
 *
 * Each `app_type` can differ; `undefined` means no row for that app in the
 * member’s role group matrix.
 *
 * @example Global Admin (four `role_group_app_roles` rows, all `admin`):
 * ```ts
 * {
 *   data_sources: "admin",
 *   data_explorer: "admin",
 *   dashboards: "admin",
 *   settings: "admin",
 * }
 * ```
 *
 * @example Global Viewer (three rows, no `settings` app;
 * `useIsGlobalAdmin()` is false):
 * ```ts
 * {
 *   data_sources: "viewer",
 *   data_explorer: "viewer",
 *   dashboards: "viewer",
 *   settings: undefined,
 * }
 * ```
 *
 * @example Custom role group matrix (non-built-in `role_groups` row):
 * ```ts
 * {
 *   data_sources: "editor",
 *   data_explorer: "viewer",
 *   dashboards: "viewer",
 *   settings: undefined,
 * }
 * ```
 */
export type UserAppRolesMatrix = Record<AppType, RoleLevel | undefined>;

/**
 * List of app roles for a user.
 *
 * Unlike in the `UserAppRolesMatrix`, no role can be left undefined.
 * Only defined roles are included in the list.
 *
 * @example
 * ```ts
 * [
 *   { app: "data_sources", role: "editor" },
 *   { app: "data_explorer", role: "viewer" },
 *   { app: "dashboards", role: "viewer" },
 *   { app: "settings", role: "admin" },
 * ]
 * ```
 */
export type UserAppRolesList = Array<{ app: AppType; role: RoleLevel }>;

/**
 * Built-in role matrix preset segment in workspace permissions UI.
 */
export type BuiltinPresetType =
  | "global_admin"
  | "global_editor"
  | "global_viewer"
  | "custom";
