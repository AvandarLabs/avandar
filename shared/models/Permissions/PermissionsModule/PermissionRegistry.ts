import type {
  AppType,
  PermissionKey,
  RoleLevel,
} from "$/models/Permissions/Permissions.types.ts";

/**
 * Full catalog: each app defines permission keys granted at each role tier.
 */
type PermissionRegistryType = Readonly<{
  [A in AppType]: {
    readonly [R in RoleLevel]: readonly PermissionKey[];
  };
}>;

/**
 * Frozen permission keys per `(app_type, role_level)` for UI catalog checks.
 */
export const PermissionRegistry = {
  data_sources: {
    viewer: [
      "data_sources__can_view_dataset",
      "data_sources__can_list_sources",
    ] as const,
    editor: [
      "data_sources__can_view_dataset",
      "data_sources__can_list_sources",
      "data_sources__can_edit_dataset",
      "data_sources__can_create_dataset",
    ] as const,
    admin: [
      "data_sources__can_view_dataset",
      "data_sources__can_list_sources",
      "data_sources__can_edit_dataset",
      "data_sources__can_create_dataset",
      "data_sources__can_manage_sources",
    ] as const,
  },
  data_explorer: {
    viewer: [
      "data_explorer__can_run_query",
      "data_explorer__can_view_results",
    ] as const,
    editor: [
      "data_explorer__can_run_query",
      "data_explorer__can_view_results",
      "data_explorer__can_save_query",
    ] as const,
    admin: [
      "data_explorer__can_run_query",
      "data_explorer__can_view_results",
      "data_explorer__can_save_query",
      "data_explorer__can_manage_explorer",
    ] as const,
  },
  dashboards: {
    viewer: ["dashboards__can_view_dashboard"] as const,
    editor: [
      "dashboards__can_view_dashboard",
      "dashboards__can_edit_dashboard",
    ] as const,
    admin: [
      "dashboards__can_view_dashboard",
      "dashboards__can_edit_dashboard",
      "dashboards__can_manage_dashboards",
    ] as const,
  },
  gis: {
    viewer: ["gis__can_view_map"] as const,
    editor: [
      "gis__can_view_map",
      "gis__can_edit_map",
      "gis__can_create_map",
    ] as const,
    admin: [
      "gis__can_view_map",
      "gis__can_edit_map",
      "gis__can_create_map",
      "gis__can_manage_maps",
    ] as const,
  },
  settings: {
    viewer: [] as const,
    editor: [] as const,
    admin: [
      "settings__can_manage_workspace_users",
      "settings__can_manage_roles_and_tags",
      "settings__can_manage_billing",
    ] as const,
  },
} as const satisfies PermissionRegistryType;
