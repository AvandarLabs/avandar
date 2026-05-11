import type { PermissionCatalog } from "$/models/Permissions/Permissions.types.ts";

/**
 * Workspace permission catalog for UI gating (derived from roles in SQL).
 *
 * @property PermissionCatalog Frozen keys per `(app_type, role_level)`.
 */
export const PermissionsModule = {
  PermissionCatalog: {
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
    settings: {
      viewer: [] as const,
      editor: [] as const,
      admin: [
        "settings__can_manage_workspace_users",
        "settings__can_manage_roles_and_tags",
        "settings__can_manage_billing",
      ] as const,
    },
  } as const satisfies PermissionCatalog,
};
